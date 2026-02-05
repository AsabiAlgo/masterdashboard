/**
 * ThemeProvider Tests
 *
 * Tests for theme application and system preference detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';

// Mock the settings store
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: vi.fn(),
  useTheme: vi.fn(),
  useAnimationsEnabled: vi.fn(),
}));

// Mock matchMedia
const createMatchMedia = (matches: boolean) => {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  return vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_event: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    },
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    // Expose for testing
    _listeners: listeners,
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach((l) => l({ matches: newMatches } as MediaQueryListEvent));
    },
  }));
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('animations-disabled');
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children', async () => {
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('dark');
    vi.mocked(useAnimationsEnabled).mockReturnValue(true);

    const { getByText } = render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should apply dark class for dark theme', async () => {
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('dark');
    vi.mocked(useAnimationsEnabled).mockReturnValue(true);

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should remove dark class for light theme', async () => {
    document.documentElement.classList.add('dark');
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('light');
    vi.mocked(useAnimationsEnabled).mockReturnValue(true);

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should respect system preference for dark mode', async () => {
    window.matchMedia = createMatchMedia(true); // System prefers dark
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('system');
    vi.mocked(useAnimationsEnabled).mockReturnValue(true);

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should respect system preference for light mode', async () => {
    window.matchMedia = createMatchMedia(false); // System prefers light
    document.documentElement.classList.add('dark');
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('system');
    vi.mocked(useAnimationsEnabled).mockReturnValue(true);

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should add animations-disabled class when animations are disabled', async () => {
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('dark');
    vi.mocked(useAnimationsEnabled).mockReturnValue(false);

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('animations-disabled')).toBe(true);
    });
  });

  it('should remove animations-disabled class when animations are enabled', async () => {
    document.documentElement.classList.add('animations-disabled');
    const { useTheme, useAnimationsEnabled } = await import('@/stores/settings-store');
    vi.mocked(useTheme).mockReturnValue('dark');
    vi.mocked(useAnimationsEnabled).mockReturnValue(true);

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('animations-disabled')).toBe(false);
    });
  });
});
