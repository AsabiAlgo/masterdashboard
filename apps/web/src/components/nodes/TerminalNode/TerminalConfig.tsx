/**
 * Terminal Configuration Modal
 *
 * Modal for configuring terminal settings including shell selection,
 * theme, font size, and other preferences.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { ShellType, type TerminalNodeData } from '@masterdashboard/shared';
import {
  terminalThemes,
  themeNames,
  getThemeDisplayName,
  type TerminalThemeName,
} from './utils/themes';
import { getShellDisplayName, AVAILABLE_SHELLS } from './hooks/useTerminal';

interface TerminalConfigProps {
  /** Node ID for reference (reserved for future use) */
  nodeId?: string;
  /** Current terminal node data */
  data: TerminalNodeData;
  /** Close the modal */
  onClose: () => void;
  /** Save configuration changes */
  onSave: (config: TerminalConfigData) => void;
  /** Current theme */
  currentTheme: TerminalThemeName;
  /** Current font size */
  currentFontSize: number;
  /** Current cursor blink setting */
  currentCursorBlink: boolean;
}

export interface TerminalConfigData {
  shell: ShellType;
  theme: TerminalThemeName;
  fontSize: number;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  scrollback: number;
}

/**
 * Close icon component
 */
function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function TerminalConfig({
  data,
  onClose,
  onSave,
  currentTheme,
  currentFontSize,
  currentCursorBlink,
}: TerminalConfigProps) {
  const [shell, setShell] = useState<ShellType>(data.shell);
  const [theme, setTheme] = useState<TerminalThemeName>(currentTheme);
  const [fontSize, setFontSize] = useState(currentFontSize);
  const [cursorBlink, setCursorBlink] = useState(currentCursorBlink);
  const [cursorStyle, setCursorStyle] = useState<'block' | 'underline' | 'bar'>(
    'block'
  );
  const [scrollback, setScrollback] = useState(10000);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave({
      shell,
      theme,
      fontSize,
      cursorBlink,
      cursorStyle,
      scrollback,
    });
    onClose();
  }, [shell, theme, fontSize, cursorBlink, cursorStyle, scrollback, onSave, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 rounded-lg shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            Terminal Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Shell Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shell
            </label>
            <select
              value={shell}
              onChange={(e) => setShell(e.target.value as ShellType)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {AVAILABLE_SHELLS.map((s) => (
                <option key={s} value={s}>
                  {getShellDisplayName(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themeNames.map((t) => {
                const themeColors = terminalThemes[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-md border transition-colors
                      ${
                        theme === t
                          ? 'border-green-500 bg-slate-800'
                          : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800'
                      }
                    `}
                  >
                    <div
                      className="w-4 h-4 rounded-sm border border-slate-600"
                      style={{ backgroundColor: themeColors.background }}
                    />
                    <span className="text-sm text-slate-300">
                      {getThemeDisplayName(t)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min={10}
              max={24}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10px</span>
              <span>24px</span>
            </div>
          </div>

          {/* Cursor Style */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cursor Style
            </label>
            <div className="flex gap-2">
              {(['block', 'underline', 'bar'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setCursorStyle(style)}
                  className={`
                    flex-1 px-3 py-2 rounded-md border text-sm capitalize transition-colors
                    ${
                      cursorStyle === style
                        ? 'border-green-500 bg-slate-800 text-white'
                        : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }
                  `}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Cursor Blink */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              Cursor Blink
            </label>
            <button
              onClick={() => setCursorBlink(!cursorBlink)}
              className={`
                w-11 h-6 rounded-full transition-colors relative
                ${cursorBlink ? 'bg-green-500' : 'bg-slate-600'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${cursorBlink ? 'left-6' : 'left-1'}
                `}
              />
            </button>
          </div>

          {/* Scrollback Buffer */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scrollback Lines: {scrollback.toLocaleString()}
            </label>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={scrollback}
              onChange={(e) => setScrollback(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1,000</span>
              <span>100,000</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
