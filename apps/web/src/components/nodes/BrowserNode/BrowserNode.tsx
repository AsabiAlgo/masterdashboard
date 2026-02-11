/**
 * Browser Node Component
 *
 * A React Flow node that provides browser automation using Playwright.
 * Displays real-time screencast and handles interactive input.
 */

'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import {
  BrowserEngine,
  type BrowserNodeData,
  DEFAULT_BROWSER_VIEWPORT,
} from '@masterdashboard/shared';

import { BaseNode } from '../BaseNode';
import { BrowserView } from './BrowserView';
import { BrowserToolbar } from './BrowserToolbar';
import { BrowserConfig } from './BrowserConfig';
import { useBrowserSocket } from './hooks/useBrowserSocket';
import { useCanvasStore } from '@/stores/canvas-store';
import { useNodeColors, useShowResizeHandles } from '@/stores/settings-store';

/**
 * Browser icon component
 */
function BrowserIcon({ className }: { className?: string }) {
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
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

interface BrowserNodeProps extends NodeProps {
  data: BrowserNodeData;
}

export const BrowserNode = memo(function BrowserNode({
  id,
  data,
  selected,
}: BrowserNodeProps) {
  const [url, setUrl] = useState(data.url || 'https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState(data.url || 'https://www.google.com');
  const [title, setTitle] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { updateNodeData } = useCanvasStore();
  const nodeColors = useNodeColors();
  const showResizeHandles = useShowResizeHandles();

  // Browser socket management
  const {
    connected,
    connecting,
    socketReady,
    connect,
    disconnect,
    sendInput,
    navigate,
    goBack,
    goForward,
    reload,
    screenshot,
  } = useBrowserSocket({
    sessionId: data.sessionId,
    onFrame: setFrame,
    onNavigated: (newUrl, newTitle) => {
      setCurrentUrl(newUrl);
      setUrl(newUrl);
      if (newTitle) {
        setTitle(newTitle);
      }
      setLoading(false);
      updateNodeData<BrowserNodeData>(id, { url: newUrl });
    },
    onConnected: (sessionId) => {
      updateNodeData<BrowserNodeData>(id, {
        sessionId,
        connected: true,
      });
    },
    onDisconnected: () => {
      updateNodeData<BrowserNodeData>(id, {
        connected: false,
      });
      setFrame(null);
    },
    onError: (_error) => {
      setLoading(false);
    },
    onConsole: (_type, _text) => {
      // Could display console messages in a panel
    },
  });

  // Auto-connect when node is created
  // Wait for socket to be ready before attempting connection
  useEffect(() => {
    if (!data.sessionId && !connecting && !connected && socketReady) {
      const timer = setTimeout(() => {
        connect({
          engine: data.engine || BrowserEngine.CHROMIUM,
          url: url,
          viewport: { ...DEFAULT_BROWSER_VIEWPORT },
          isInteractive: true,
          projectId: data.projectId,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data.sessionId, data.engine, data.projectId, url, connect, connecting, connected, socketReady]);

  // Handle navigation
  const handleNavigate = useCallback(() => {
    let targetUrl = url.trim();

    // Add protocol if missing
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      // Check if it looks like a search query
      if (targetUrl.includes(' ') || !targetUrl.includes('.')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
      } else {
        targetUrl = `https://${targetUrl}`;
      }
      setUrl(targetUrl);
    }

    setLoading(true);
    navigate(targetUrl);
  }, [url, navigate]);

  // Handle screenshot download
  const handleScreenshot = useCallback(async () => {
    const dataUrl = await screenshot();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `screenshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [screenshot]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setLoading(true);
    goBack();
  }, [goBack]);

  // Handle forward navigation
  const handleForward = useCallback(() => {
    setLoading(true);
    goForward();
  }, [goForward]);

  // Handle reload
  const handleReload = useCallback(() => {
    setLoading(true);
    reload();
  }, [reload]);

  // Handle config save
  const handleSaveConfig = useCallback(
    (config: { engine: BrowserEngine; viewport: { width: number; height: number } }) => {
      // If engine changed, need to restart session
      if (config.engine !== data.engine) {
        disconnect();
        updateNodeData<BrowserNodeData>(id, {
          engine: config.engine,
          sessionId: '',
          connected: false,
        });
        // New session will be created by the auto-connect effect
      }
      setShowConfig(false);
    },
    [data.engine, disconnect, id, updateNodeData]
  );

  // Get display title
  const displayTitle = title || (currentUrl ? getHostname(currentUrl) : 'Browser');

  return (
    <>
      <NodeResizer
        minWidth={500}
        minHeight={350}
        isVisible={selected}
        lineClassName="!border-transparent"
        handleClassName={showResizeHandles ? '' : '!w-0 !h-0 !border-0 !bg-transparent !min-w-0 !min-h-0'}
        handleStyle={showResizeHandles ? undefined : { opacity: 0, width: 0, height: 0, border: 'none', pointerEvents: 'none' }}
      />

      <BaseNode
        id={id}
        title={displayTitle}
        icon={<BrowserIcon className="w-4 h-4" />}
        headerColor={nodeColors.browser.header}
        borderColor={nodeColors.browser.border}
        connected={connected}
        selected={selected}
      >
        <div className="w-full h-full flex flex-col min-h-[300px]">
          <BrowserToolbar
            url={url}
            onUrlChange={setUrl}
            onNavigate={handleNavigate}
            onBack={handleBack}
            onForward={handleForward}
            onReload={handleReload}
            onScreenshot={handleScreenshot}
            onSettings={() => setShowConfig(true)}
            loading={loading}
            connected={connected}
          />

          <div className="flex-1 overflow-hidden">
            <BrowserView
              frame={frame}
              onInput={sendInput}
              isInteractive={connected}
              selected={selected}
              viewportWidth={DEFAULT_BROWSER_VIEWPORT.width}
              viewportHeight={DEFAULT_BROWSER_VIEWPORT.height}
            />
          </div>

          {/* Connection status overlay */}
          {connecting && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-sm">Launching browser...</div>
            </div>
          )}
        </div>
      </BaseNode>

      {showConfig && (
        <BrowserConfig
          nodeId={id}
          data={data}
          onClose={() => setShowConfig(false)}
          onSave={handleSaveConfig}
        />
      )}
    </>
  );
});

/**
 * Extract hostname from URL
 */
function getHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
