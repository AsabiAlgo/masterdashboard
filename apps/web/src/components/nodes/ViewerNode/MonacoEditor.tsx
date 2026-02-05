/**
 * Monaco Editor Component
 *
 * A wrapper around Monaco Editor with custom theme and configuration.
 */

'use client';

import { memo, useCallback, useRef } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

import { masterDashboardTheme, THEME_NAME } from './monaco-theme';

interface MonacoEditorProps {
  /** The content to display */
  value: string;
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Monaco language identifier */
  language?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Show the minimap */
  showMinimap?: boolean;
  /** Enable word wrap */
  wordWrap?: boolean;
  /** Font size */
  fontSize?: number;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Callback when Ctrl+S is pressed */
  onSave?: () => void;
  /** Callback when Ctrl+Enter is pressed (for SQL execution) */
  onExecute?: () => void;
}

/**
 * Loading indicator while Monaco is loading
 */
function LoadingIndicator() {
  return (
    <div
      data-testid="monaco-loading"
      className="flex items-center justify-center h-full bg-slate-900"
    >
      <div className="flex flex-col items-center gap-3">
        <svg
          className="w-8 h-8 animate-spin text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-slate-500">Loading editor...</span>
      </div>
    </div>
  );
}

export const MonacoEditor = memo(function MonacoEditor({
  value,
  onChange,
  language = 'plaintext',
  readOnly = false,
  showMinimap = true,
  wordWrap = false,
  fontSize = 14,
  showLineNumbers = true,
  onSave,
  onExecute,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Define theme before editor mounts
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme(THEME_NAME, masterDashboardTheme);
  }, []);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Register Ctrl+S save command
      if (onSave) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave();
        });
      }

      // Register Ctrl+Enter execute command (for SQL editor)
      if (onExecute) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          onExecute();
        });
      }

      // Focus the editor
      editor.focus();
    },
    [onSave, onExecute]
  );

  // Handle content change
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (onChange && newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  // Editor options
  const options: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    fontSize,
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontLigatures: true,
    lineNumbers: showLineNumbers ? 'on' : 'off',
    wordWrap: wordWrap ? 'on' : 'off',
    minimap: {
      enabled: showMinimap,
    },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'selection',
    tabSize: 2,
    insertSpaces: true,
    automaticLayout: true,
    padding: {
      top: 8,
      bottom: 8,
    },
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false,
    },
    bracketPairColorization: {
      enabled: true,
    },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    hover: {
      enabled: false,
    },
    quickSuggestions: false,
    parameterHints: {
      enabled: false,
    },
    suggestOnTriggerCharacters: false,
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={value ?? ''}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        theme={THEME_NAME}
        options={options}
        loading={<LoadingIndicator />}
      />
    </div>
  );
});
