/**
 * Editor Settings Component
 *
 * Settings for editor preferences like tab size, word wrap, line numbers, etc.
 */

'use client';

import { useSettingsStore } from '@/stores/settings-store';

const TAB_SIZE_OPTIONS = [2, 4, 8];

export function EditorSettings() {
  const {
    tabSize,
    setTabSize,
    wordWrap,
    setWordWrap,
    lineNumbers,
    setLineNumbers,
    autoSave,
    setAutoSave,
    autoSaveInterval,
    setAutoSaveInterval,
  } = useSettingsStore();

  // Convert interval to seconds for display
  const intervalSeconds = Math.round(autoSaveInterval / 1000);

  return (
    <div className="space-y-8">
      {/* Formatting Section */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Formatting
        </h3>
        <div className="space-y-4">
          {/* Tab Size */}
          <div className="settings-row">
            <label
              className="text-sm"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Tab Size
            </label>
            <div className="flex gap-2">
              {TAB_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => setTabSize(size)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    tabSize === size ? 'border-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor:
                      tabSize === size
                        ? 'rgba(var(--accent-primary), 0.1)'
                        : 'rgb(var(--bg-tertiary))',
                    borderColor:
                      tabSize === size
                        ? 'rgb(var(--accent-primary))'
                        : 'rgb(var(--border-primary))',
                    color:
                      tabSize === size
                        ? 'rgb(var(--accent-primary))'
                        : 'rgb(var(--text-secondary))',
                  }}
                  data-testid={`tab-size-${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Word Wrap */}
          <div className="settings-row">
            <div>
              <label
                className="text-sm"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                Word Wrap
              </label>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                Wrap long lines in the editor
              </p>
            </div>
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                backgroundColor: wordWrap
                  ? 'rgb(var(--accent-primary))'
                  : 'rgb(var(--bg-tertiary))',
              }}
              data-testid="word-wrap-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  wordWrap ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Line Numbers */}
          <div className="settings-row">
            <div>
              <label
                className="text-sm"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                Line Numbers
              </label>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                Show line numbers in the gutter
              </p>
            </div>
            <button
              onClick={() => setLineNumbers(!lineNumbers)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                backgroundColor: lineNumbers
                  ? 'rgb(var(--accent-primary))'
                  : 'rgb(var(--bg-tertiary))',
              }}
              data-testid="line-numbers-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  lineNumbers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Auto Save Section */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Auto Save
        </h3>
        <div className="space-y-4">
          {/* Enable Auto Save */}
          <div className="settings-row">
            <div>
              <label
                className="text-sm"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                Enable Auto Save
              </label>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                Automatically save changes periodically
              </p>
            </div>
            <button
              onClick={() => setAutoSave(!autoSave)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                backgroundColor: autoSave
                  ? 'rgb(var(--accent-primary))'
                  : 'rgb(var(--bg-tertiary))',
              }}
              data-testid="auto-save-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  autoSave ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto Save Interval */}
          {autoSave && (
            <div className="settings-row">
              <label
                className="text-sm"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                Auto Save Interval
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={intervalSeconds}
                  onChange={(e) =>
                    setAutoSaveInterval(Number(e.target.value) * 1000)
                  }
                  className="w-32"
                  style={{
                    accentColor: 'rgb(var(--accent-primary))',
                  }}
                  data-testid="auto-save-interval"
                />
                <span
                  className="text-sm w-16 text-right"
                  style={{ color: 'rgb(var(--text-secondary))' }}
                >
                  {intervalSeconds}s
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Preview Section */}
      <section className="settings-section">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Editor Preview
        </h3>
        <div
          className="rounded-lg overflow-hidden border"
          style={{ borderColor: 'rgb(var(--border-primary))' }}
        >
          <div
            className="px-4 py-2 text-xs font-medium border-b"
            style={{
              backgroundColor: 'rgb(var(--bg-tertiary))',
              borderColor: 'rgb(var(--border-primary))',
              color: 'rgb(var(--text-secondary))',
            }}
          >
            example.ts
          </div>
          <div
            className="p-4 font-mono text-sm overflow-x-auto"
            style={{
              backgroundColor: 'rgb(var(--bg-primary))',
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            }}
          >
            <div className="flex">
              {lineNumbers && (
                <div
                  className="pr-4 mr-4 border-r select-none"
                  style={{
                    borderColor: 'rgb(var(--border-primary))',
                    color: 'rgb(var(--text-muted))',
                  }}
                >
                  <div>1</div>
                  <div>2</div>
                  <div>3</div>
                  <div>4</div>
                  <div>5</div>
                  <div>6</div>
                </div>
              )}
              <div style={{ color: 'rgb(var(--text-primary))' }}>
                <div>
                  <span style={{ color: 'rgb(var(--accent-primary))' }}>interface</span>{' '}
                  <span style={{ color: 'rgb(var(--accent-warning))' }}>Settings</span>{' '}
                  {'{'}
                </div>
                <div>
                  {'\t'.repeat(tabSize / 2)}
                  <span style={{ color: 'rgb(var(--accent-info))' }}>theme</span>:{' '}
                  <span style={{ color: 'rgb(var(--accent-success))' }}>&apos;dark&apos;</span> |{' '}
                  <span style={{ color: 'rgb(var(--accent-success))' }}>&apos;light&apos;</span>;
                </div>
                <div>
                  {'\t'.repeat(tabSize / 2)}
                  <span style={{ color: 'rgb(var(--accent-info))' }}>fontSize</span>:{' '}
                  <span style={{ color: 'rgb(var(--accent-primary))' }}>number</span>;
                </div>
                <div>{'}'}</div>
                <div>&nbsp;</div>
                <div>
                  <span style={{ color: 'rgb(var(--accent-primary))' }}>export</span>{' '}
                  <span style={{ color: 'rgb(var(--accent-primary))' }}>const</span>{' '}
                  <span style={{ color: 'rgb(var(--accent-warning))' }}>defaultSettings</span>:{' '}
                  <span style={{ color: 'rgb(var(--accent-warning))' }}>Settings</span>;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
