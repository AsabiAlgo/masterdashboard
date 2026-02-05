/**
 * Theme Provider
 *
 * Manages theme application based on settings store.
 * Handles dark/light mode and system preference detection.
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useTheme, useAnimationsEnabled } from '@/stores/settings-store';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component that applies theme classes to the document
 * based on the current theme setting and system preferences.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useTheme();
  const animationsEnabled = useAnimationsEnabled();

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Apply initial system preference
      root.classList.toggle('dark', mediaQuery.matches);

      // Listen for system preference changes
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Apply animations setting
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('animations-disabled', !animationsEnabled);
  }, [animationsEnabled]);

  return <>{children}</>;
}
