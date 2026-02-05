/**
 * Settings Panel Component
 *
 * Modal dialog for managing application settings.
 * Contains tabs for Appearance, Terminal, Keyboard, and Editor settings.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { AppearanceSettings } from './AppearanceSettings';
import { TerminalSettings } from './TerminalSettings';
import { KeyboardSettings } from './KeyboardSettings';
import { EditorSettings } from './EditorSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'appearance' | 'terminal' | 'keyboard' | 'editor';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'keyboard',
    label: 'Keyboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const panelRef = useRef<HTMLDivElement>(null);
  const { exportSettings, importSettings, resetToDefaults } = useSettingsStore();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Export settings to clipboard
  const handleExport = useCallback(() => {
    const settings = exportSettings();
    navigator.clipboard.writeText(settings);
  }, [exportSettings]);

  // Import settings from clipboard
  const handleImport = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      importSettings(text);
    } catch {
      // Clipboard access denied or failed - ignore silently
    }
  }, [importSettings]);

  // Reset to defaults with confirmation
  const handleReset = useCallback(() => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      resetToDefaults();
    }
  }, [resetToDefaults]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="settings-backdrop"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        style={{
          backgroundColor: 'rgb(var(--bg-secondary))',
          border: '1px solid rgb(var(--border-primary))',
        }}
        data-testid="settings-panel"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgb(var(--border-primary))' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            Settings
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-theme-hover"
              style={{ color: 'rgb(var(--text-secondary))' }}
              title="Export settings to clipboard"
              data-testid="export-settings"
            >
              Export
            </button>
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-theme-hover"
              style={{ color: 'rgb(var(--text-secondary))' }}
              title="Import settings from clipboard"
              data-testid="import-settings"
            >
              Import
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-theme-hover"
              style={{ color: 'rgb(var(--accent-error))' }}
              title="Reset to defaults"
              data-testid="reset-to-defaults"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-theme-hover"
              style={{ color: 'rgb(var(--text-secondary))' }}
              aria-label="Close settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div
            className="w-48 p-2 border-r flex-shrink-0"
            style={{ borderColor: 'rgb(var(--border-primary))' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  activeTab === tab.id
                    ? 'bg-theme-accent-primary/10'
                    : 'hover:bg-theme-hover'
                }`}
                style={{
                  color:
                    activeTab === tab.id
                      ? 'rgb(var(--accent-primary))'
                      : 'rgb(var(--text-secondary))',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'appearance' && (
              <div data-testid="appearance-settings">
                <AppearanceSettings />
              </div>
            )}
            {activeTab === 'terminal' && (
              <div data-testid="terminal-settings">
                <TerminalSettings />
              </div>
            )}
            {activeTab === 'keyboard' && (
              <div data-testid="keyboard-settings">
                <KeyboardSettings />
              </div>
            )}
            {activeTab === 'editor' && (
              <div data-testid="editor-settings">
                <EditorSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
