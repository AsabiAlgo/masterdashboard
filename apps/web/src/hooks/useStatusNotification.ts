/**
 * Status Notification Hook
 *
 * Listens to WebSocket status change events and updates the status store.
 * Triggers sound notifications and auto-focus when terminals need input.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { WS_EVENTS, type StatusChangeEvent } from '@masterdashboard/shared';
import { useStatusStore } from '@/stores/status-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { useWebSocket } from './useWebSocket';
import { useNotificationSound } from './useSound';

interface UseStatusNotificationOptions {
  /** Whether status notifications are enabled */
  enabled?: boolean;
  /** Whether to play sounds on status change */
  playSounds?: boolean;
  /** Callback when status changes */
  onStatusChange?: (event: StatusChangeEvent) => void;
}

interface UseStatusNotificationReturn {
  /** Subscribe to status changes for a specific session */
  subscribeSession: (sessionId: string) => void;
  /** Unsubscribe from status changes for a session */
  unsubscribeSession: (sessionId: string) => void;
}

export function useStatusNotification(
  options: UseStatusNotificationOptions = {}
): UseStatusNotificationReturn {
  const { enabled = true, playSounds = true, onStatusChange } = options;

  const { on } = useWebSocket();
  const { handleStatusChange } = useStatusStore();
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const nodes = useCanvasStore((state) => state.nodes);

  // Sound notification (prepared for future use)
  useNotificationSound('notification', {
    enabled: playSounds,
    volume: 0.5,
  });

  // Handle status change events from WebSocket
  const handleStatusChangeEvent = useCallback(
    (event: StatusChangeEvent) => {
      if (!enabled) return;

      // Update the status store
      handleStatusChange(event);

      // Find and update the node with this session
      const node = nodes.find((n) => n.data.sessionId === event.sessionId);
      if (node) {
        updateNodeData(node.id, {
          activityStatus: event.newStatus,
        });
      }

      // Call custom callback if provided
      onStatusChange?.(event);
    },
    [enabled, handleStatusChange, nodes, updateNodeData, onStatusChange]
  );

  // Subscribe to WebSocket status change events
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = on(WS_EVENTS.STATUS_CHANGE, handleStatusChangeEvent);

    return () => {
      unsubscribe();
    };
  }, [enabled, on, handleStatusChangeEvent]);

  // Session subscription management (for future use with selective subscriptions)
  const subscribeSession = useCallback((sessionId: string) => {
    // Currently all sessions are subscribed by default
    // This could be enhanced to subscribe to specific sessions only
    console.debug('[StatusNotification] Subscribed to session:', sessionId);
  }, []);

  const unsubscribeSession = useCallback((sessionId: string) => {
    // Clear session from status store when unsubscribing
    const { clearSession } = useStatusStore.getState();
    clearSession(sessionId);
    console.debug('[StatusNotification] Unsubscribed from session:', sessionId);
  }, []);

  return {
    subscribeSession,
    unsubscribeSession,
  };
}

/**
 * Hook to listen for focus terminal events
 * Used by the canvas to focus on terminals that need attention
 */
export function useFocusTerminal(
  onFocus: (sessionId: string) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleFocusEvent = (event: CustomEvent<string>) => {
      onFocus(event.detail);
    };

    window.addEventListener(
      'focusTerminal',
      handleFocusEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        'focusTerminal',
        handleFocusEvent as EventListener
      );
    };
  }, [enabled, onFocus]);
}
