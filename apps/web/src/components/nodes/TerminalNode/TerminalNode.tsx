/**
 * Terminal Node Component
 *
 * A React Flow node that provides a full terminal emulator using xterm.js.
 * Connects to backend PTY sessions via WebSocket for real terminal interaction.
 * Sessions persist across browser disconnects via tmux.
 */

'use client';

import { memo, useRef, useCallback, useEffect, useState } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import {
  ShellType,
  type TerminalNodeData,
  TerminalActivityStatus,
} from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { Terminal, type TerminalHandle } from './Terminal';
import { TerminalToolbar } from './TerminalToolbar';
import { TerminalConfig, type TerminalConfigData } from './TerminalConfig';
import { StatusIndicator, StatusGlow } from './StatusIndicator';
import { useTerminalSocket } from './hooks/useTerminalSocket';
import { useTerminal } from './hooks/useTerminal';
import { useCanvasStore } from '@/stores/canvas-store';

/**
 * Terminal icon component
 */
function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

interface TerminalNodeProps extends NodeProps {
  data: TerminalNodeData;
}

export const TerminalNode = memo(function TerminalNode({
  id,
  data,
  selected,
}: TerminalNodeProps) {
  const terminalRef = useRef<TerminalHandle>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [title, setTitle] = useState(data.label);
  const [cwd, setCwd] = useState(data.cwd ?? '~');
  // Flag to prevent auto-reconnect - user must manually click reconnect
  const manualReconnectRequired = useRef(false);

  const { updateNodeData } = useCanvasStore();
  const { settings, updateSettings } = useTerminal();

  // Handle session expired - clear sessionId and show message
  // Set manualReconnectRequired so user must click to start new session
  const handleSessionExpired = useCallback(() => {
    manualReconnectRequired.current = true;
    updateNodeData<TerminalNodeData>(id, {
      sessionId: '',
      connected: false,
      activityStatus: TerminalActivityStatus.IDLE,
    });
    terminalRef.current?.writeln(
      '\r\n\x1b[33m[Session expired - click reconnect to start new session]\x1b[0m\r\n'
    );
  }, [id, updateNodeData]);

  // Handle clear terminal for clean replay
  const handleClearTerminal = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  // Terminal socket management
  const {
    connected,
    connecting,
    socketReady,
    connect,
    disconnect,
    sendInput,
    sendResize,
    reconnect,
  } = useTerminalSocket({
    sessionId: data.sessionId,
    onOutput: (output) => {
      terminalRef.current?.write(output);
    },
    onConnected: (sessionId) => {
      updateNodeData<TerminalNodeData>(id, {
        sessionId,
        connected: true,
        activityStatus: TerminalActivityStatus.IDLE,
      });
    },
    onDisconnected: (exitCode) => {
      // Require manual action after disconnect - don't auto-restart
      manualReconnectRequired.current = true;
      updateNodeData<TerminalNodeData>(id, {
        connected: false,
        activityStatus: TerminalActivityStatus.IDLE,
      });
      if (exitCode !== undefined) {
        terminalRef.current?.writeln(`\r\n[Process exited with code ${exitCode}]`);
      }
      terminalRef.current?.writeln(`\r\n\x1b[33m[Click reconnect to resume or start new session]\x1b[0m\r\n`);
    },
    onError: (error) => {
      // Always require manual action - don't auto-restart
      manualReconnectRequired.current = true;

      // Check if this is a recoverable error (PTY died but tmux alive)
      const isRecoverable = error.includes('Connection lost') || error.includes('click reconnect');

      if (isRecoverable) {
        // Keep sessionId so user can reconnect to existing session
        updateNodeData<TerminalNodeData>(id, {
          connected: false,
          activityStatus: TerminalActivityStatus.IDLE,
        });
        terminalRef.current?.writeln(`\r\n\x1b[33m[${error}]\x1b[0m\r\n`);
      } else {
        // Session truly gone - clear sessionId but DON'T auto-restart
        updateNodeData<TerminalNodeData>(id, {
          sessionId: '',
          connected: false,
          activityStatus: TerminalActivityStatus.IDLE,
        });
        terminalRef.current?.writeln(`\r\n\x1b[33m[Session lost - click reconnect to start new session]\x1b[0m\r\n`);
      }
    },
    onReconnect: (bufferedOutput) => {
      if (bufferedOutput) {
        // Terminal is fresh after page refresh, just write the buffer
        terminalRef.current?.write(bufferedOutput);
      }
    },
    onSessionExpired: handleSessionExpired,
    onClearTerminal: handleClearTerminal,
  });

  // Auto-connect on initial mount:
  // - Fresh terminal (no sessionId): create new session
  // - Existing terminal (has sessionId): reconnect to existing session
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || connecting || !socketReady) {
      return;
    }

    if (data.sessionId) {
      // Existing session - reconnect to it
      hasInitialized.current = true;
      reconnect(data.sessionId);
    } else {
      // Fresh terminal - create new session
      hasInitialized.current = true;
      connect({
        shell: data.shell ?? ShellType.BASH,
        cwd: data.cwd,
        projectId: data.projectId,
      });
    }
  }, [data.sessionId, data.shell, data.cwd, data.projectId, connect, reconnect, connecting, socketReady]);

  // Sync terminal size with server when connection is established
  // This ensures the PTY size matches the actual rendered terminal
  useEffect(() => {
    if (connected) {
      // Small delay to ensure terminal has fully rendered and fit
      const timer = setTimeout(() => {
        const dims = terminalRef.current?.getDimensions();
        if (dims && dims.cols > 0 && dims.rows > 0) {
          sendResize(dims.cols, dims.rows);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [connected, sendResize]);

  // Handle terminal input
  const handleData = useCallback(
    (inputData: string) => {
      sendInput(inputData);
    },
    [sendInput]
  );

  // Handle terminal resize
  const handleResize = useCallback(
    (cols: number, rows: number) => {
      sendResize(cols, rows);
    },
    [sendResize]
  );

  // Handle terminal title change (from escape sequences)
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      // Extract CWD from title if it follows common patterns
      const cwdMatch = newTitle.match(/^.*?:\s*(.+?)(?:\s*[-–]\s*.+)?$/);
      if (cwdMatch?.[1]) {
        setCwd(cwdMatch[1]);
        updateNodeData<TerminalNodeData>(id, { cwd: cwdMatch[1] });
      }
    },
    [id, updateNodeData]
  );

  // Copy selection to clipboard
  const handleCopy = useCallback(() => {
    const selection = terminalRef.current?.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection);
    }
  }, []);

  // Clear terminal
  const handleClear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  // Handle reconnection
  const handleReconnect = useCallback(() => {
    // Clear the manual reconnect flag since user is explicitly reconnecting
    manualReconnectRequired.current = false;
    if (data.sessionId) {
      reconnect(data.sessionId);
    } else {
      connect({
        shell: data.shell ?? ShellType.BASH,
        cwd: data.cwd,
        projectId: data.projectId,
      });
    }
  }, [data.sessionId, data.shell, data.cwd, data.projectId, reconnect, connect]);

  // Save configuration changes
  const handleSaveConfig = useCallback(
    (config: TerminalConfigData) => {
      updateSettings({
        theme: config.theme,
        fontSize: config.fontSize,
        cursorBlink: config.cursorBlink,
        cursorStyle: config.cursorStyle,
        scrollback: config.scrollback,
      });

      // If shell changed, we need to create a new session
      if (config.shell !== data.shell) {
        disconnect();
        updateNodeData<TerminalNodeData>(id, {
          shell: config.shell,
          sessionId: '',
          connected: false,
        });
        // New session will be created by the auto-connect effect
      }
    },
    [data.shell, disconnect, id, updateNodeData, updateSettings]
  );

  // Focus terminal when selected, blur and clear selection when deselected
  useEffect(() => {
    if (selected) {
      terminalRef.current?.focus();
    } else {
      terminalRef.current?.clearSelection();
      terminalRef.current?.blur();
    }
  }, [selected]);

  // Cleanup: terminate session when node is removed (unmounted)
  useEffect(() => {
    return () => {
      // Disconnect terminates the backend session (kills tmux)
      disconnect();
    };
  }, [disconnect]);

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={250}
        isVisible={selected}
        lineClassName="!border-green-500"
        handleClassName="!w-3 !h-3 !bg-green-500 !border-green-600"
      />

      <StatusGlow status={data.activityStatus} className="w-full h-full">
        <BaseNode
          id={id}
          title={title}
          icon={<TerminalIcon className="w-4 h-4" />}
          headerColor="bg-green-600"
          connected={connected}
          selected={selected}
          statusIndicator={
            <StatusIndicator
              status={data.activityStatus}
              size="sm"
              showPulse={true}
            />
          }
        >
          <div className="w-full h-full flex flex-col">
            <TerminalToolbar
              onCopy={handleCopy}
              onClear={handleClear}
              onSettings={() => setShowConfig(true)}
              onReconnect={!connected ? handleReconnect : undefined}
              connected={connected}
              connecting={connecting}
              isReconnecting={connecting && !!data.sessionId}
              cwd={cwd}
              activityStatus={data.activityStatus}
            />

            <div className="flex-1 min-h-[200px] overflow-hidden nodrag nopan nowheel">
              <Terminal
                ref={terminalRef}
                onData={handleData}
                onResize={handleResize}
                onTitleChange={handleTitleChange}
                theme={settings.theme}
                fontSize={settings.fontSize}
                fontFamily={settings.fontFamily}
                cursorBlink={settings.cursorBlink}
                cursorStyle={settings.cursorStyle}
                scrollback={settings.scrollback}
                disabled={!connected}
              />
            </div>
          </div>
        </BaseNode>
      </StatusGlow>

      {showConfig && (
        <TerminalConfig
          nodeId={id}
          data={data}
          onClose={() => setShowConfig(false)}
          onSave={handleSaveConfig}
          currentTheme={settings.theme}
          currentFontSize={settings.fontSize}
          currentCursorBlink={settings.cursorBlink}
        />
      )}
    </>
  );
});
