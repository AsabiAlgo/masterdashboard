/**
 * CommandPalette Component
 *
 * VS Code-style command palette with quick open (Ctrl+P) and
 * command execution (Ctrl+K) modes.
 */

'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useCommandStore } from '@/stores/command-store';
import { useProjectStore } from '@/stores/project-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { useCommands, type Command } from '@/hooks/useCommands';
import { useQuickOpen, type FileResult } from '@/hooks/useQuickOpen';
import { sortByScore } from '@/utils/fuzzy-search';
import { CommandItem } from './CommandItem';
import { FileItem } from './FileItem';
import { NodeType, type ViewerNodeData, type ViewerContentType } from '@masterdashboard/shared';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const CommandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

// Content type detection for viewer
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp']);
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.swift', '.sh', '.bash', '.zsh',
  '.sql', '.graphql', '.gql',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.xml', '.yaml', '.yml', '.toml', '.json', '.jsonc',
  '.vue', '.svelte', '.astro',
]);

function detectContentType(fileName: string, extension: string): ViewerContentType {
  const ext = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const name = fileName.toLowerCase();

  if (['dockerfile', 'makefile', 'jenkinsfile', 'vagrantfile'].includes(name)) return 'code';
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (name.startsWith('.') || ext === '.env') return 'code';

  return 'text';
}

export function CommandPalette() {
  const {
    isOpen,
    mode,
    query,
    selectedIndex,
    setQuery,
    setSelectedIndex,
    setMode,
    close,
    addRecentCommand,
    addRecentFile,
    recentCommands,
    recentFiles,
  } = useCommandStore();

  const currentProject = useProjectStore((s) => s.currentProject);
  const { addNode, updateNodeData } = useCanvasStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get commands
  const commands = useCommands();

  // Get file search results
  const rootPath = currentProject?.defaultCwd ?? '~';
  const { results: fileResults, loading: filesLoading, search: searchFiles } = useQuickOpen({
    rootPath,
    projectId: currentProject?.id,
    maxResults: 20,
    debounceMs: 150,
  });

  // Filter and sort commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) {
      // Show recent commands first, then all commands
      const recentSet = new Set(recentCommands);
      const recent = commands.filter((c) => recentSet.has(c.id));
      const others = commands.filter((c) => !recentSet.has(c.id));
      return [...recent, ...others].slice(0, 15);
    }

    // Combine title and keywords for better matching
    return sortByScore(commands, query, (c) =>
      `${c.title} ${c.keywords?.join(' ') ?? ''}`
    ).slice(0, 15);
  }, [commands, query, recentCommands]);

  // Combine recent files with search results
  const displayedFiles = useMemo(() => {
    if (!query && mode === 'files') {
      // Show recent files when no query
      return recentFiles.map((path) => ({
        path,
        name: path.split('/').pop() ?? path,
        type: 'file' as const,
        extension: path.includes('.') ? path.split('.').pop() ?? '' : '',
      }));
    }
    return fileResults;
  }, [fileResults, query, mode, recentFiles]);

  // Items to display based on mode
  const items = mode === 'files' ? displayedFiles : filteredCommands;
  const maxIndex = Math.max(0, items.length - 1);

  // Trigger file search when query changes in files mode
  useEffect(() => {
    if (mode === 'files' && query) {
      searchFiles(query);
    }
  }, [mode, query, searchFiles]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Execute a command
  const executeCommand = useCallback(
    (command: Command) => {
      addRecentCommand(command.id);
      close();
      // Execute after close animation
      setTimeout(() => {
        command.action();
      }, 50);
    },
    [addRecentCommand, close]
  );

  // Open a file
  const openFile = useCallback(
    (file: FileResult) => {
      addRecentFile(file.path);
      close();
      // Create a viewer node for the file
      setTimeout(() => {
        const nodeId = addNode(NodeType.VIEWER, { x: 100, y: 100 });
        // Detect content type based on file extension
        const ext = file.extension.startsWith('.') ? file.extension : `.${file.extension}`;
        const contentType = detectContentType(file.name, ext);
        // Update the node with file data to trigger content loading
        setTimeout(() => {
          updateNodeData<ViewerNodeData>(nodeId, {
            filePath: file.path,
            fileName: file.name,
            extension: ext,
            contentType,
            loading: true,
            editMode: false,
            isDirty: false,
            editContent: null,
          });
        }, 50);
      }, 50);
    },
    [addRecentFile, close, addNode, updateNodeData]
  );

  // Execute selected item
  const executeSelected = useCallback(() => {
    if (mode === 'files') {
      const file = displayedFiles[selectedIndex];
      if (file) {
        openFile(file);
      }
    } else {
      const command = filteredCommands[selectedIndex];
      if (command) {
        executeCommand(command);
      }
    }
  }, [
    mode,
    displayedFiles,
    filteredCommands,
    selectedIndex,
    openFile,
    executeCommand,
  ]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, maxIndex));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          executeSelected();
          break;

        case 'Escape':
          e.preventDefault();
          close();
          break;

        case 'Tab':
          // Tab switches between modes
          e.preventDefault();
          setMode(mode === 'files' ? 'commands' : 'files');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    selectedIndex,
    maxIndex,
    mode,
    setSelectedIndex,
    setMode,
    executeSelected,
    close,
  ]);

  // Don't render if closed
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      data-testid="command-palette"
    >
      {/* Backdrop */}
      <div
        data-testid="command-palette-backdrop"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div
        className="
          relative w-full max-w-xl mx-4
          bg-slate-900 rounded-xl shadow-2xl
          border border-slate-700/50
          overflow-hidden
          animate-in fade-in slide-in-from-top-4 duration-150
        "
      >
        {/* Mode tabs */}
        <div className="flex border-b border-slate-700/50">
          <button
            onClick={() => setMode('commands')}
            className={`
              flex items-center gap-2 px-4 py-2 text-xs font-medium
              transition-colors
              ${
                mode === 'commands'
                  ? 'text-blue-400 border-b-2 border-blue-400 -mb-px bg-blue-500/5'
                  : 'text-slate-400 hover:text-slate-300'
              }
            `}
          >
            <CommandIcon />
            Commands
            <kbd className="px-1 py-0.5 text-[10px] bg-slate-800 rounded">⌘K</kbd>
          </button>
          <button
            onClick={() => setMode('files')}
            className={`
              flex items-center gap-2 px-4 py-2 text-xs font-medium
              transition-colors
              ${
                mode === 'files'
                  ? 'text-blue-400 border-b-2 border-blue-400 -mb-px bg-blue-500/5'
                  : 'text-slate-400 hover:text-slate-300'
              }
            `}
          >
            <FileIcon />
            Files
            <kbd className="px-1 py-0.5 text-[10px] bg-slate-800 rounded">⌘P</kbd>
          </button>
          <div className="flex-1" />
          <button
            onClick={close}
            className="px-3 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-700/50">
          <span className="text-slate-400 mr-3">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            data-testid="command-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === 'files'
                ? 'Search files by name...'
                : 'Type a command or search...'
            }
            className="
              flex-1 bg-transparent text-slate-100
              outline-none placeholder-slate-500
              text-sm
            "
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-2"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto"
        >
          {mode === 'files' ? (
            // File results
            <>
              {filesLoading && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-2" />
                  Searching...
                </div>
              )}
              {!filesLoading && displayedFiles.length === 0 && query && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No files found matching &ldquo;{query}&rdquo;
                </div>
              )}
              {!filesLoading && displayedFiles.length === 0 && !query && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  Start typing to search files...
                </div>
              )}
              {displayedFiles.map((file, i) => (
                <FileItem
                  key={file.path}
                  file={file}
                  isSelected={i === selectedIndex}
                  query={query}
                  onClick={() => openFile(file)}
                />
              ))}
            </>
          ) : (
            // Command results
            <>
              {filteredCommands.length === 0 && query && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No commands found matching &ldquo;{query}&rdquo;
                </div>
              )}
              {filteredCommands.map((command, i) => (
                <CommandItem
                  key={command.id}
                  command={command}
                  isSelected={i === selectedIndex}
                  query={query}
                  onClick={() => executeCommand(command)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700/50 text-xs text-slate-500 flex gap-4">
          <span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">↑↓</kbd>
            {' '}Navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">↵</kbd>
            {' '}Select
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Tab</kbd>
            {' '}Switch mode
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Esc</kbd>
            {' '}Close
          </span>
        </div>
      </div>
    </div>
  );
}
