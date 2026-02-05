/**
 * Sound Hook
 *
 * Custom hook for playing notification sounds.
 * Handles audio initialization, playback, and volume control.
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';

interface UseSoundOptions {
  /** Volume level (0-1) */
  volume?: number;
  /** Whether to preload the audio file */
  preload?: boolean;
  /** Whether playback is enabled */
  enabled?: boolean;
}

interface UseSoundReturn {
  /** Play the sound */
  play: () => void;
  /** Stop the sound */
  stop: () => void;
  /** Set volume level (0-1) */
  setVolume: (volume: number) => void;
  /** Whether the audio is currently playing */
  isPlaying: boolean;
}

export function useSound(
  src: string,
  options: UseSoundOptions = {}
): UseSoundReturn {
  const { volume = 0.5, preload = true, enabled = true } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize audio lazily
  const getAudio = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioRef.current) {
      try {
        audioRef.current = new Audio(src);
        audioRef.current.volume = Math.max(0, Math.min(1, volume));

        if (preload) {
          audioRef.current.load();
        }

        // Track playing state
        audioRef.current.addEventListener('playing', () => {
          isPlayingRef.current = true;
        });

        audioRef.current.addEventListener('ended', () => {
          isPlayingRef.current = false;
        });

        audioRef.current.addEventListener('pause', () => {
          isPlayingRef.current = false;
        });
      } catch {
        // Audio not supported
        return null;
      }
    }

    return audioRef.current;
  }, [src, volume, preload]);

  // Initialize on mount if preload is enabled
  useEffect(() => {
    if (preload && enabled) {
      getAudio();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [preload, enabled, getAudio]);

  const play = useCallback(() => {
    if (!enabled) return;

    const audio = getAudio();
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {
      // Silently fail if audio can't play (e.g., no user interaction yet)
    });
  }, [enabled, getAudio]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  return {
    play,
    stop,
    setVolume,
    isPlaying: isPlayingRef.current,
  };
}

/**
 * Hook for notification sounds with preset sounds
 */
export type NotificationSoundType =
  | 'notification'
  | 'success'
  | 'error'
  | 'warning';

const SOUND_PATHS: Record<NotificationSoundType, string> = {
  notification: '/sounds/notification.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  warning: '/sounds/warning.mp3',
};

export function useNotificationSound(
  type: NotificationSoundType = 'notification',
  options: Omit<UseSoundOptions, 'preload'> = {}
) {
  return useSound(SOUND_PATHS[type], {
    ...options,
    preload: true,
  });
}
