/**
 * Monaco Editor Theme
 *
 * Custom dark theme matching Master Dashboard's slate-900 design.
 */

import type { editor } from 'monaco-editor';

export const THEME_NAME = 'master-dashboard';

/**
 * Master Dashboard Monaco Editor Theme
 *
 * Based on VS Dark with custom colors matching the app's Tailwind slate palette.
 */
export const masterDashboardTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Syntax highlighting overrides (inherit most from vs-dark)
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' }, // gray-500
    { token: 'keyword', foreground: 'c084fc' }, // purple-400
    { token: 'string', foreground: '4ade80' }, // green-400
    { token: 'number', foreground: 'fb923c' }, // orange-400
    { token: 'type', foreground: '60a5fa' }, // blue-400
    { token: 'function', foreground: 'fbbf24' }, // amber-400
    { token: 'variable', foreground: 'e2e8f0' }, // slate-200
    { token: 'constant', foreground: 'f472b6' }, // pink-400
    { token: 'operator', foreground: '94a3b8' }, // slate-400
  ],
  colors: {
    // Editor background
    'editor.background': '#0f172a', // slate-900
    'editor.foreground': '#e2e8f0', // slate-200

    // Line numbers
    'editorLineNumber.foreground': '#64748b', // slate-500
    'editorLineNumber.activeForeground': '#94a3b8', // slate-400

    // Gutter
    'editorGutter.background': '#0f172a', // slate-900

    // Cursor
    'editorCursor.foreground': '#3b82f6', // blue-500

    // Selection
    'editor.selectionBackground': '#334155', // slate-700
    'editor.selectionHighlightBackground': '#334155aa', // slate-700 with alpha
    'editor.inactiveSelectionBackground': '#1e293b', // slate-800

    // Current line
    'editor.lineHighlightBackground': '#1e293b', // slate-800
    'editor.lineHighlightBorder': '#1e293b00', // transparent

    // Indentation guides
    'editorIndentGuide.background': '#334155', // slate-700
    'editorIndentGuide.activeBackground': '#475569', // slate-600

    // Whitespace
    'editorWhitespace.foreground': '#334155', // slate-700

    // Bracket matching
    'editorBracketMatch.background': '#334155', // slate-700
    'editorBracketMatch.border': '#3b82f6', // blue-500

    // Ruler
    'editorRuler.foreground': '#334155', // slate-700

    // Widgets (find dialog, etc.)
    'editorWidget.background': '#1e293b', // slate-800
    'editorWidget.foreground': '#e2e8f0', // slate-200
    'editorWidget.border': '#334155', // slate-700
    'input.background': '#0f172a', // slate-900
    'input.foreground': '#e2e8f0', // slate-200
    'input.border': '#475569', // slate-600
    'input.placeholderForeground': '#64748b', // slate-500

    // Dropdown
    'dropdown.background': '#1e293b', // slate-800
    'dropdown.foreground': '#e2e8f0', // slate-200
    'dropdown.border': '#334155', // slate-700

    // Buttons
    'button.background': '#3b82f6', // blue-500
    'button.foreground': '#ffffff',
    'button.hoverBackground': '#2563eb', // blue-600

    // Scrollbar
    'scrollbar.shadow': '#00000000', // transparent
    'scrollbarSlider.background': '#47556980', // slate-600 with alpha
    'scrollbarSlider.hoverBackground': '#64748b80', // slate-500 with alpha
    'scrollbarSlider.activeBackground': '#94a3b880', // slate-400 with alpha

    // Minimap
    'minimap.background': '#0f172a', // slate-900
    'minimap.selectionHighlight': '#3b82f680', // blue-500 with alpha
    'minimapSlider.background': '#47556940', // slate-600 with alpha
    'minimapSlider.hoverBackground': '#47556960',
    'minimapSlider.activeBackground': '#47556980',

    // Overview ruler (right edge)
    'editorOverviewRuler.border': '#1e293b', // slate-800
    'editorOverviewRuler.background': '#0f172a', // slate-900

    // Error/warning squiggles
    'editorError.foreground': '#f87171', // red-400
    'editorWarning.foreground': '#fbbf24', // amber-400
    'editorInfo.foreground': '#60a5fa', // blue-400

    // Focus border
    'focusBorder': '#3b82f6', // blue-500

    // List (autocomplete, etc.)
    'list.hoverBackground': '#1e293b', // slate-800
    'list.activeSelectionBackground': '#334155', // slate-700
    'list.activeSelectionForeground': '#e2e8f0', // slate-200
    'list.inactiveSelectionBackground': '#1e293b', // slate-800
    'list.highlightForeground': '#60a5fa', // blue-400
  },
};
