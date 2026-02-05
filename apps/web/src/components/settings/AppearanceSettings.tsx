/**
 * Appearance Settings Component
 *
 * Settings for theme mode, font size, font family, and animations.
 */

'use client';

import { useSettingsStore, type ThemeMode } from '@/stores/settings-store';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const FONT_FAMILIES = [
  { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' },
  { value: 'Fira Code, monospace', label: 'Fira Code' },
  { value: 'Source Code Pro, monospace', label: 'Source Code Pro' },
  { value: 'Monaco, monospace', label: 'Monaco' },
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: 'SF Mono, monospace', label: 'SF Mono' },
];

export function AppearanceSettings() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    showMinimap,
    setShowMinimap,
    animationsEnabled,
    setAnimationsEnabled,
  } = useSettingsStore();

  return (
    <div className="space-y-8">
      {/* Theme Section */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Theme
        </h3>
        <div className="flex gap-3">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                theme === option.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-transparent hover:bg-theme-hover'
              }`}
              style={{
                borderColor:
                  theme === option.value
                    ? 'rgb(var(--accent-primary))'
                    : 'rgb(var(--border-primary))',
                color:
                  theme === option.value
                    ? 'rgb(var(--accent-primary))'
                    : 'rgb(var(--text-secondary))',
              }}
              data-testid={`theme-${option.value}`}
            >
              {option.icon}
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Font Section */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Font
        </h3>
        <div className="space-y-4">
          {/* Font Size */}
          <div className="settings-row">
            <label
              className="text-sm"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Font Size
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-theme-hover transition-colors"
                style={{ color: 'rgb(var(--text-secondary))' }}
              >
                −
              </button>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                min={10}
                max={24}
                className="w-16 px-2 py-1 text-center rounded-lg border text-sm"
                style={{
                  backgroundColor: 'rgb(var(--bg-input))',
                  borderColor: 'rgb(var(--border-primary))',
                  color: 'rgb(var(--text-primary))',
                }}
                data-testid="font-size-input"
              />
              <button
                onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-theme-hover transition-colors"
                style={{ color: 'rgb(var(--text-secondary))' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div className="settings-row">
            <label
              className="text-sm"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm cursor-pointer min-w-[180px]"
              style={{
                backgroundColor: 'rgb(var(--bg-input))',
                borderColor: 'rgb(var(--border-primary))',
                color: 'rgb(var(--text-primary))',
              }}
              data-testid="font-family-select"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Interface Section */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Interface
        </h3>
        <div className="space-y-4">
          {/* Show Minimap */}
          <div className="settings-row">
            <label
              className="text-sm"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Show Minimap
            </label>
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                showMinimap ? 'bg-blue-500' : 'bg-slate-600'
              }`}
              style={{
                backgroundColor: showMinimap
                  ? 'rgb(var(--accent-primary))'
                  : 'rgb(var(--bg-tertiary))',
              }}
              data-testid="minimap-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  showMinimap ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Animations */}
          <div className="settings-row">
            <label
              className="text-sm"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Enable Animations
            </label>
            <button
              onClick={() => setAnimationsEnabled(!animationsEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors`}
              style={{
                backgroundColor: animationsEnabled
                  ? 'rgb(var(--accent-primary))'
                  : 'rgb(var(--bg-tertiary))',
              }}
              data-testid="animations-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  animationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Preview
        </h3>
        <div
          className="p-4 rounded-lg font-mono"
          style={{
            backgroundColor: 'rgb(var(--bg-tertiary))',
            fontSize: `${fontSize}px`,
            fontFamily,
            color: 'rgb(var(--text-primary))',
          }}
        >
          <div>const greeting = &quot;Hello, World!&quot;;</div>
          <div style={{ color: 'rgb(var(--accent-success))' }}>
            // This is a comment
          </div>
          <div>
            <span style={{ color: 'rgb(var(--accent-primary))' }}>function</span>{' '}
            <span style={{ color: 'rgb(var(--accent-warning))' }}>example</span>
            () {'{'} <span style={{ color: 'rgb(var(--accent-error))' }}>return</span>{' '}
            true; {'}'}
          </div>
        </div>
      </section>
    </div>
  );
}
