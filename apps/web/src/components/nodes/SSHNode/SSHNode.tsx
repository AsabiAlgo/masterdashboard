/**
 * SSH Node Component
 *
 * A React Flow node that provides SSH terminal access to remote servers.
 * Uses ssh2 on the backend and xterm.js for terminal rendering.
 */

'use client';

import { memo, useRef, useCallback, useEffect, useState } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import {
  type SSHNodeData,
  TerminalActivityStatus,
  type SSHAuthMethod,
} from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { Terminal, type TerminalHandle } from '../TerminalNode/Terminal';
import { StatusIndicator, StatusGlow } from '../TerminalNode/StatusIndicator';
import { SSHConnectModal } from './SSHConnectModal';
import { useSSHSocket } from './hooks/useSSHSocket';
import { useCanvasStore } from '@/stores/canvas-store';
import { useTerminal } from '../TerminalNode/hooks/useTerminal';

/**
 * SSH icon component
 */
function SSHIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}

/**
 * Wifi icon for connection status
 */
function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
      />
    </svg>
  );
}

/**
 * Wifi off icon for disconnected status
 */
function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-12.728-12.728m12.728 12.728L5.636 5.636m12.728 0a9 9 0 00-12.728 0m12.728 0L5.636 18.364"
      />
    </svg>
  );
}

/**
 * Settings icon
 */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

interface SSHNodeProps extends NodeProps {
  data: SSHNodeData;
}

export const SSHNode = memo(function SSHNode({
  id,
  data,
  selected,
}: SSHNodeProps) {
  const terminalRef = useRef<TerminalHandle>(null);
  const [showConnectModal, setShowConnectModal] = useState(!data.sessionId);
  const [connectionInfo, setConnectionInfo] = useState<{
    host: string;
    username: string;
  } | null>(
    data.host && data.username
      ? { host: data.host, username: data.username }
      : null
  );

  const { updateNodeData } = useCanvasStore();
  const { settings } = useTerminal();

  // SSH socket management
  const {
    connected,
    connecting,
    connect,
    disconnect,
    sendInput,
    sendResize,
  } = useSSHSocket({
    sessionId: data.sessionId,
    onOutput: (output) => {
      terminalRef.current?.write(output);
    },
    onConnected: (sessionId, info) => {
      updateNodeData<SSHNodeData>(id, {
        sessionId,
        connected: true,
        host: info.host,
        username: info.username,
        activityStatus: TerminalActivityStatus.IDLE,
      });
      setConnectionInfo(info);
      setShowConnectModal(false);
    },
    onDisconnected: () => {
      updateNodeData<SSHNodeData>(id, {
        connected: false,
        activityStatus: TerminalActivityStatus.IDLE,
      });
      setConnectionInfo(null);
      terminalRef.current?.writeln('\r\n\x1b[33m[SSH connection closed]\x1b[0m');
    },
    onKeyboardInteractive: (prompts) => {
      // Handle 2FA or other prompts
      // For now, just log them - could show a modal in the future
      for (const prompt of prompts) {
        terminalRef.current?.writeln(`\r\n\x1b[33m${prompt.prompt}\x1b[0m`);
      }
    },
    onError: (error) => {
      updateNodeData<SSHNodeData>(id, {
        activityStatus: TerminalActivityStatus.ERROR,
      });
      terminalRef.current?.writeln(`\r\n\x1b[31mError: ${error}\x1b[0m`);
    },
  });

  // Handle connect
  const handleConnect = useCallback(
    (config: {
      host: string;
      port?: number;
      username: string;
      authMethod: SSHAuthMethod;
      password?: string;
      privateKey?: string;
      passphrase?: string;
    }) => {
      connect(config);
    },
    [connect]
  );

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

  // Focus terminal when selected
  useEffect(() => {
    if (selected && connected) {
      terminalRef.current?.focus();
    }
  }, [selected, connected]);

  // Build title
  const title = connectionInfo
    ? `${connectionInfo.username}@${connectionInfo.host}`
    : data.label || 'SSH';

  return (
    <>
      <NodeResizer
        minWidth={400}
        minHeight={250}
        isVisible={selected}
        lineClassName="!border-amber-500"
        handleClassName="!w-3 !h-3 !bg-amber-500 !border-amber-600"
      />

      <StatusGlow status={data.activityStatus ?? TerminalActivityStatus.IDLE} className="w-full h-full">
        <BaseNode
          id={id}
          title={title}
          icon={<SSHIcon className="w-4 h-4" />}
          headerColor="bg-amber-600"
          connected={connected}
          selected={selected}
          statusIndicator={
            <StatusIndicator
              status={data.activityStatus ?? TerminalActivityStatus.IDLE}
              size="sm"
              showPulse={true}
            />
          }
        >
          <div className="w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 border-b border-gray-700">
              <button
                onClick={() => setShowConnectModal(true)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  connected
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {connected ? (
                  <>
                    <WifiIcon className="w-3 h-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOffIcon className="w-3 h-3" />
                    Connect
                  </>
                )}
              </button>

              {connected && (
                <button
                  onClick={disconnect}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 rounded text-xs text-white transition-colors"
                >
                  Disconnect
                </button>
              )}

              {connected && (
                <>
                  <div className="h-4 w-px bg-gray-600" />
                  <button
                    onClick={handleCopy}
                    className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                    title="Copy selection"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                    title="Clear terminal"
                  >
                    Clear
                  </button>
                </>
              )}

              <div className="flex-1" />

              <button
                onClick={() => setShowConnectModal(true)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {/* Terminal or placeholder */}
            <div className="flex-1 min-h-[200px] overflow-hidden">
              {connected ? (
                <Terminal
                  ref={terminalRef}
                  onData={handleData}
                  onResize={handleResize}
                  theme={settings.theme}
                  fontSize={settings.fontSize}
                  fontFamily={settings.fontFamily}
                  cursorBlink={settings.cursorBlink}
                  cursorStyle={settings.cursorStyle}
                  scrollback={settings.scrollback}
                  disabled={!connected}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
                  <div className="text-center">
                    <SSHIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {connecting
                        ? 'Connecting to SSH server...'
                        : 'Click "Connect" to establish SSH connection'}
                    </p>
                    {connectionInfo && !connecting && (
                      <p className="text-xs text-gray-600 mt-1">
                        Last: {connectionInfo.username}@{connectionInfo.host}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </BaseNode>
      </StatusGlow>

      {showConnectModal && (
        <SSHConnectModal
          onConnect={handleConnect}
          onClose={() => setShowConnectModal(false)}
          isConnecting={connecting}
          initialHost={data.host}
          initialUsername={data.username}
        />
      )}
    </>
  );
});
