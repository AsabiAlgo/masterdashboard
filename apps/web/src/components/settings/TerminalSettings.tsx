/**
 * Terminal Settings Component
 *
 * Settings for terminal color themes.
 */

'use client';

import { useSettingsStore, type TerminalTheme } from '@/stores/settings-store';
import { TERMINAL_THEMES, TERMINAL_THEME_NAMES } from '@/themes/terminal-themes';

export function TerminalSettings() {
  const { terminalTheme, setTerminalTheme, fontSize, fontFamily } = useSettingsStore();

  const themes = Object.keys(TERMINAL_THEMES) as TerminalTheme[];

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Terminal Theme
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => {
            const colors = TERMINAL_THEMES[theme];
            const isSelected = terminalTheme === theme;

            return (
              <button
                key={theme}
                onClick={() => setTerminalTheme(theme)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: colors.background,
                  borderColor: isSelected
                    ? 'rgb(var(--accent-primary))'
                    : 'rgb(var(--border-primary))',
                  '--tw-ring-color': 'rgb(var(--accent-primary))',
                  '--tw-ring-offset-color': 'rgb(var(--bg-secondary))',
                } as React.CSSProperties}
                data-testid={`terminal-theme-${theme}`}
              >
                <div
                  className="text-sm font-medium mb-2"
                  style={{ color: colors.foreground }}
                >
                  {TERMINAL_THEME_NAMES[theme]}
                </div>
                <div className="flex gap-1">
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colors.red }}
                  />
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colors.green }}
                  />
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colors.yellow }}
                  />
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colors.blue }}
                  />
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colors.magenta }}
                  />
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colors.cyan }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Preview
        </h3>
        <TerminalPreview
          theme={terminalTheme}
          fontSize={fontSize}
          fontFamily={fontFamily}
        />
      </section>
    </div>
  );
}

interface TerminalPreviewProps {
  theme: TerminalTheme;
  fontSize: number;
  fontFamily: string;
}

function TerminalPreview({ theme, fontSize, fontFamily }: TerminalPreviewProps) {
  const colors = TERMINAL_THEMES[theme];

  return (
    <div
      className="p-4 rounded-lg font-mono overflow-hidden"
      style={{
        backgroundColor: colors.background,
        fontSize: `${fontSize}px`,
        fontFamily,
      }}
    >
      <div className="space-y-1">
        <div>
          <span style={{ color: colors.green }}>user@localhost</span>
          <span style={{ color: colors.foreground }}>:</span>
          <span style={{ color: colors.blue }}>~/projects</span>
          <span style={{ color: colors.foreground }}>$ </span>
          <span style={{ color: colors.foreground }}>ls -la</span>
        </div>
        <div style={{ color: colors.foreground }}>
          <span style={{ color: colors.blue }}>drwxr-xr-x</span> 5 user staff 160 Jan 15{' '}
          <span style={{ color: colors.cyan }}>src</span>
        </div>
        <div style={{ color: colors.foreground }}>
          <span style={{ color: colors.blue }}>-rw-r--r--</span> 1 user staff 1234 Jan 15{' '}
          <span style={{ color: colors.yellow }}>package.json</span>
        </div>
        <div style={{ color: colors.foreground }}>
          <span style={{ color: colors.blue }}>-rw-r--r--</span> 1 user staff 4567 Jan 15{' '}
          <span style={{ color: colors.green }}>README.md</span>
        </div>
        <div>
          <span style={{ color: colors.green }}>user@localhost</span>
          <span style={{ color: colors.foreground }}>:</span>
          <span style={{ color: colors.blue }}>~/projects</span>
          <span style={{ color: colors.foreground }}>$ </span>
          <span style={{ color: colors.red }}>npm run build</span>
        </div>
        <div>
          <span style={{ color: colors.yellow }}>warning</span>
          <span style={{ color: colors.foreground }}>: Build completed with warnings</span>
        </div>
        <div>
          <span style={{ color: colors.green }}>success</span>
          <span style={{ color: colors.foreground }}>: Bundle created in 2.5s</span>
        </div>
        <div>
          <span style={{ color: colors.green }}>user@localhost</span>
          <span style={{ color: colors.foreground }}>:</span>
          <span style={{ color: colors.blue }}>~/projects</span>
          <span style={{ color: colors.foreground }}>$ </span>
          <span
            className="animate-pulse"
            style={{ backgroundColor: colors.cursor, width: '8px', display: 'inline-block' }}
          >
            &nbsp;
          </span>
        </div>
      </div>
    </div>
  );
}
