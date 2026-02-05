/**
 * Status Store
 *
 * Zustand store for managing terminal activity status,
 * waiting queue, and notification settings.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  TerminalActivityStatus,
  type StatusChangeEvent,
} from '@masterdashboard/shared';

interface StatusState {
  // Session statuses
  statuses: Map<string, TerminalActivityStatus>;

  // Waiting queue (sessions awaiting input)
  waitingQueue: string[];

  // Notification settings
  soundEnabled: boolean;
  autoFocusEnabled: boolean;

  // Actions
  updateStatus: (sessionId: string, status: TerminalActivityStatus) => void;
  handleStatusChange: (event: StatusChangeEvent) => void;
  getStatus: (sessionId: string) => TerminalActivityStatus;
  toggleSound: () => void;
  toggleAutoFocus: () => void;

  // Queue management
  addToWaitingQueue: (sessionId: string) => void;
  removeFromWaitingQueue: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;

  // Bulk operations
  clearAllStatuses: () => void;
}

// Sound notification helper
let audioInstance: HTMLAudioElement | null = null;

function playNotificationSound(): void {
  try {
    if (!audioInstance) {
      audioInstance = new Audio('/sounds/notification.mp3');
      audioInstance.volume = 0.5;
    }
    audioInstance.currentTime = 0;
    audioInstance.play().catch(() => {
      // Silently fail if audio can't play (e.g., no user interaction yet)
    });
  } catch {
    // Audio not supported
  }
}

export const useStatusStore = create<StatusState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        statuses: new Map(),
        waitingQueue: [],
        soundEnabled: true,
        autoFocusEnabled: false, // Off by default to prevent screen jumping

        updateStatus: (sessionId, status) => {
          set((state) => {
            const newStatuses = new Map(state.statuses);
            newStatuses.set(sessionId, status);
            return { statuses: newStatuses };
          });
        },

        handleStatusChange: (event) => {
          const { sessionId, newStatus, previousStatus } = event;
          const {
            soundEnabled,
            autoFocusEnabled,
            updateStatus,
            addToWaitingQueue,
            removeFromWaitingQueue,
          } = get();

          updateStatus(sessionId, newStatus);

          // Handle waiting status
          if (newStatus === TerminalActivityStatus.WAITING) {
            addToWaitingQueue(sessionId);

            // Play sound notification
            if (soundEnabled && previousStatus !== TerminalActivityStatus.WAITING) {
              playNotificationSound();
            }

            // Auto-focus (if enabled)
            if (autoFocusEnabled) {
              // Emit event for canvas to focus this node
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('focusTerminal', { detail: sessionId })
                );
              }
            }
          } else {
            removeFromWaitingQueue(sessionId);
          }
        },

        getStatus: (sessionId) => {
          return get().statuses.get(sessionId) ?? TerminalActivityStatus.IDLE;
        },

        toggleSound: () =>
          set((state) => ({ soundEnabled: !state.soundEnabled })),

        toggleAutoFocus: () =>
          set((state) => ({ autoFocusEnabled: !state.autoFocusEnabled })),

        addToWaitingQueue: (sessionId) => {
          set((state) => {
            if (state.waitingQueue.includes(sessionId)) return state;
            return { waitingQueue: [...state.waitingQueue, sessionId] };
          });
        },

        removeFromWaitingQueue: (sessionId) => {
          set((state) => ({
            waitingQueue: state.waitingQueue.filter((id) => id !== sessionId),
          }));
        },

        clearSession: (sessionId) => {
          set((state) => {
            const newStatuses = new Map(state.statuses);
            newStatuses.delete(sessionId);
            return {
              statuses: newStatuses,
              waitingQueue: state.waitingQueue.filter((id) => id !== sessionId),
            };
          });
        },

        clearAllStatuses: () => {
          set({
            statuses: new Map(),
            waitingQueue: [],
          });
        },
      }),
      {
        name: 'masterdashboard-status',
        partialize: (state) => ({
          soundEnabled: state.soundEnabled,
          autoFocusEnabled: state.autoFocusEnabled,
        }),
        // Custom serialization for Map
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str);
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            localStorage.removeItem(name);
          },
        },
      }
    ),
    { name: 'StatusStore' }
  )
);

// Selector hooks for optimized renders
export const useWaitingQueue = () =>
  useStatusStore((state) => state.waitingQueue);

export const useSoundEnabled = () =>
  useStatusStore((state) => state.soundEnabled);

export const useAutoFocusEnabled = () =>
  useStatusStore((state) => state.autoFocusEnabled);

export const useSessionStatus = (sessionId: string) =>
  useStatusStore((state) => state.statuses.get(sessionId) ?? TerminalActivityStatus.IDLE);
