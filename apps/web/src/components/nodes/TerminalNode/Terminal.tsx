/**
 * Terminal Component
 *
 * xterm.js wrapper component providing terminal emulation functionality.
 * Uses dynamic imports to avoid SSR issues with xterm.js.
 */

'use client';

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import type { Terminal as XTermType, ITheme } from 'xterm';
import type { FitAddon as FitAddonType } from 'xterm-addon-fit';

import { terminalThemes, type TerminalThemeName } from './utils/themes';
import { useCanvasStore } from '@/stores/canvas-store';
import { NodeType } from '@masterdashboard/shared';

/**
 * Terminal handle for imperative methods
 */
export interface TerminalHandle {
  /** Write data to the terminal */
  write: (data: string) => void;
  /** Write a line with newline appended */
  writeln: (data: string) => void;
  /** Focus the terminal */
  focus: () => void;
  /** Blur the terminal */
  blur: () => void;
  /** Fit terminal to container size */
  fit: () => { cols: number; rows: number } | undefined;
  /** Clear the terminal */
  clear: () => void;
  /** Reset the terminal (clear + reset state) */
  reset: () => void;
  /** Get current selection text */
  getSelection: () => string;
  /** Select all text */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Scroll to top */
  scrollToTop: () => void;
  /** Scroll to bottom */
  scrollToBottom: () => void;
  /** Get current dimensions */
  getDimensions: () => { cols: number; rows: number } | undefined;
}

interface TerminalProps {
  /** Callback when user types (keyboard input) */
  onData?: (data: string) => void;
  /** Callback when terminal resizes */
  onResize?: (cols: number, rows: number) => void;
  /** Callback when terminal title changes */
  onTitleChange?: (title: string) => void;
  /** Callback when selection changes */
  onSelectionChange?: (selection: string) => void;
  /** Terminal color theme */
  theme?: TerminalThemeName;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Enable cursor blinking */
  cursorBlink?: boolean;
  /** Cursor style */
  cursorStyle?: 'block' | 'underline' | 'bar';
  /** Scrollback buffer size */
  scrollback?: number;
  /** Whether terminal is disabled (no input) */
  disabled?: boolean;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal(
    {
      onData,
      onResize,
      onTitleChange,
      onSelectionChange,
      theme = 'dracula',
      fontSize = 14,
      fontFamily = 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      cursorBlink = true,
      cursorStyle = 'block',
      scrollback = 10000,
      disabled = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTermType | null>(null);
    const fitAddonRef = useRef<FitAddonType | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const isDisposedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get canvas store for keyboard navigation
    const { nodes, selectedNodeId, setSelectedNode } = useCanvasStore();

    // Store in refs for access in event handlers
    const nodesRef = useRef(nodes);
    const selectedNodeIdRef = useRef(selectedNodeId);
    const setSelectedNodeRef = useRef(setSelectedNode);

    // Keep refs updated
    useEffect(() => {
      nodesRef.current = nodes;
      selectedNodeIdRef.current = selectedNodeId;
      setSelectedNodeRef.current = setSelectedNode;
    }, [nodes, selectedNodeId, setSelectedNode]);

    // Initialize terminal with dynamic imports
    useEffect(() => {
      if (!containerRef.current || terminalRef.current) return;

      let isMounted = true;
      isDisposedRef.current = false;

      async function initTerminal() {
        try {
          // Dynamically import xterm CSS and modules to avoid SSR issues
          // CSS must be imported dynamically to prevent webpack from processing xterm during SSR
          const [
            { Terminal: XTerm },
            { FitAddon },
            { WebLinksAddon },
          ] = await Promise.all([
            import('xterm'),
            import('xterm-addon-fit'),
            import('xterm-addon-web-links'),
            import('xterm/css/xterm.css'),
          ]);

          if (!isMounted || !containerRef.current) return;

          const terminal = new XTerm({
            cursorBlink,
            cursorStyle,
            fontSize,
            fontFamily,
            theme: terminalThemes[theme] as ITheme,
            allowProposedApi: true,
            scrollback,
            convertEol: true,
            disableStdin: disabled,
          });

          // Load addons
          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon((_event, uri) => {
            window.open(uri, '_blank', 'noopener,noreferrer');
          });

          terminal.loadAddon(fitAddon);
          terminal.loadAddon(webLinksAddon);

          // Open terminal in container
          terminal.open(containerRef.current);

          // Handle navigation shortcuts directly instead of relying on event bubbling
          terminal.attachCustomKeyEventHandler((event) => {
            const currentNodes = nodesRef.current;
            const currentSelectedId = selectedNodeIdRef.current;
            const setSelected = setSelectedNodeRef.current;

            // Get terminal nodes
            const terminals = currentNodes.filter((n) => n.type === NodeType.TERMINAL);
            if (terminals.length === 0) return true;

            // Cmd/Ctrl + Shift + Arrow: Cycle terminals
            if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                const currentIndex = currentSelectedId
                  ? terminals.findIndex((t) => t.id === currentSelectedId)
                  : -1;
                const nextIndex = (currentIndex + 1) % terminals.length;
                const nextTerminal = terminals[nextIndex];
                if (nextTerminal) setSelected(nextTerminal.id);
                return false;
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                const currentIndex = currentSelectedId
                  ? terminals.findIndex((t) => t.id === currentSelectedId)
                  : 0;
                const prevIndex = currentIndex <= 0 ? terminals.length - 1 : currentIndex - 1;
                const prevTerminal = terminals[prevIndex];
                if (prevTerminal) setSelected(prevTerminal.id);
                return false;
              }
            }

            // Cmd/Ctrl + 1-9: Jump to terminal by number
            if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
              event.preventDefault();
              const index = parseInt(event.key, 10) - 1;
              const targetTerminal = terminals[index];
              if (targetTerminal) setSelected(targetTerminal.id);
              return false;
            }

            // Let Escape pass through to terminal (needed for vim, less, etc.)
            // Users can click outside to deselect

            return true; // Handle all other keys normally
          });

          // Write SGR reset to initialize terminal with theme colors
          // This ensures the default foreground/background are properly set
          terminal.write('\x1b[0m');

          // Initial fit - wait for terminal to fully initialize
          requestAnimationFrame(() => {
            if (isDisposedRef.current) return;
            try {
              fitAddon.fit();
            } catch {
              // Terminal may not be ready yet
            }
          });

          // Event handlers - always register onData, disableStdin handles the blocking
          terminal.onData((data) => {
            onData?.(data);
          });

          terminal.onResize(({ cols, rows }) => {
            onResize?.(cols, rows);
          });

          terminal.onTitleChange((title) => {
            onTitleChange?.(title);
          });

          terminal.onSelectionChange(() => {
            const selection = terminal.getSelection();
            onSelectionChange?.(selection);
          });

          // Store refs
          terminalRef.current = terminal;
          fitAddonRef.current = fitAddon;

          // Handle container resize
          const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
              // Guard against calls during/after disposal
              if (isDisposedRef.current) return;
              if (!fitAddonRef.current || !terminalRef.current) return;

              try {
                fitAddonRef.current.fit();
              } catch {
                // Terminal may be in an invalid state during disposal
              }
            });
          });
          resizeObserver.observe(containerRef.current);
          resizeObserverRef.current = resizeObserver;

          setIsLoading(false);
        } catch (error) {
          console.error('Failed to initialize terminal:', error);
        }
      }

      initTerminal();

      return () => {
        isMounted = false;
        isDisposedRef.current = true;

        // Disconnect observer first to prevent callbacks during disposal
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }

        // Dispose terminal
        if (terminalRef.current) {
          try {
            terminalRef.current.dispose();
          } catch {
            // Ignore errors during disposal
          }
          terminalRef.current = null;
        }
        fitAddonRef.current = null;
      };
    }, []); // Only initialize once

    // Update theme when it changes
    useEffect(() => {
      if (terminalRef.current) {
        terminalRef.current.options.theme = terminalThemes[theme] as ITheme;
      }
    }, [theme]);

    // Update font size when it changes
    useEffect(() => {
      if (isDisposedRef.current || !terminalRef.current) return;
      terminalRef.current.options.fontSize = fontSize;
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Ignore fit errors
      }
    }, [fontSize]);

    // Update font family when it changes
    useEffect(() => {
      if (isDisposedRef.current || !terminalRef.current) return;
      terminalRef.current.options.fontFamily = fontFamily;
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Ignore fit errors
      }
    }, [fontFamily]);

    // Update cursor blink when it changes
    useEffect(() => {
      if (terminalRef.current) {
        terminalRef.current.options.cursorBlink = cursorBlink;
      }
    }, [cursorBlink]);

    // Update cursor style when it changes
    useEffect(() => {
      if (terminalRef.current) {
        terminalRef.current.options.cursorStyle = cursorStyle;
      }
    }, [cursorStyle]);

    // Update disabled state
    useEffect(() => {
      if (terminalRef.current) {
        terminalRef.current.options.disableStdin = disabled;
      }
    }, [disabled]);

    // Fit terminal on container size
    const fit = useCallback(() => {
      if (isDisposedRef.current) return undefined;
      if (!fitAddonRef.current || !terminalRef.current) return undefined;

      try {
        fitAddonRef.current.fit();
        return {
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows,
        };
      } catch {
        // Terminal may be in an invalid state
        return undefined;
      }
    }, []);

    // Expose terminal methods via ref
    useImperativeHandle(
      ref,
      () => ({
        write: (data: string) => {
          terminalRef.current?.write(data);
        },
        writeln: (data: string) => {
          terminalRef.current?.writeln(data);
        },
        focus: () => {
          terminalRef.current?.focus();
        },
        blur: () => {
          terminalRef.current?.blur();
        },
        fit,
        clear: () => {
          terminalRef.current?.clear();
        },
        reset: () => {
          terminalRef.current?.reset();
        },
        getSelection: () => {
          return terminalRef.current?.getSelection() ?? '';
        },
        selectAll: () => {
          terminalRef.current?.selectAll();
        },
        clearSelection: () => {
          terminalRef.current?.clearSelection();
        },
        scrollToTop: () => {
          terminalRef.current?.scrollToTop();
        },
        scrollToBottom: () => {
          terminalRef.current?.scrollToBottom();
        },
        getDimensions: () => {
          if (terminalRef.current) {
            return {
              cols: terminalRef.current.cols,
              rows: terminalRef.current.rows,
            };
          }
          return undefined;
        },
      }),
      [fit]
    );

    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[100px]"
        style={{
          backgroundColor: terminalThemes[theme].background,
        }}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-500 text-sm">Loading terminal...</span>
          </div>
        )}
      </div>
    );
  }
);
