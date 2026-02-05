/**
 * Keyboard Shortcuts Hook Tests
 *
 * Unit tests for global keyboard shortcuts including command palette activation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useCanvasStore } from '@/stores/canvas-store';
import { useCommandStore } from '@/stores/command-store';
import { NodeType } from '@masterdashboard/shared';

// Mock the stores
vi.mock('@/stores/canvas-store', () => ({
  useCanvasStore: vi.fn(),
}));

vi.mock('@/stores/command-store', () => ({
  useCommandStore: vi.fn(),
}));

describe('useKeyboardShortcuts', () => {
  const mockSetSelectedNode = vi.fn();
  const mockAddNode = vi.fn();
  const mockOpenCommandPalette = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Default canvas store mock
    vi.mocked(useCanvasStore).mockReturnValue({
      nodes: [],
      selectedNodeId: null,
      setSelectedNode: mockSetSelectedNode,
      addNode: mockAddNode,
    } as unknown as ReturnType<typeof useCanvasStore>);

    // Default command store mock
    vi.mocked(useCommandStore).mockReturnValue({
      open: mockOpenCommandPalette,
      isOpen: false,
    } as unknown as ReturnType<typeof useCommandStore>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('command palette shortcuts', () => {
    it('should open command palette on Ctrl+K', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockOpenCommandPalette).toHaveBeenCalledWith('commands');
    });

    it('should open command palette on Cmd+K', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockOpenCommandPalette).toHaveBeenCalledWith('commands');
    });

    it('should open quick open (files) on Ctrl+P', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockOpenCommandPalette).toHaveBeenCalledWith('files');
    });

    it('should open quick open (files) on Cmd+P', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockOpenCommandPalette).toHaveBeenCalledWith('files');
    });

    it('should not handle shortcuts when command palette is open', () => {
      vi.mocked(useCommandStore).mockReturnValue({
        open: mockOpenCommandPalette,
        isOpen: true,
      } as unknown as ReturnType<typeof useCommandStore>);

      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockOpenCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('terminal navigation', () => {
    it('should cycle to next terminal on Cmd+Shift+Right', () => {
      const terminals = [
        { id: 'term-1', type: NodeType.TERMINAL, data: {} },
        { id: 'term-2', type: NodeType.TERMINAL, data: {} },
      ];

      vi.mocked(useCanvasStore).mockReturnValue({
        nodes: terminals,
        selectedNodeId: 'term-1',
        setSelectedNode: mockSetSelectedNode,
        addNode: mockAddNode,
      } as unknown as ReturnType<typeof useCanvasStore>);

      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockSetSelectedNode).toHaveBeenCalledWith('term-2');
    });

    it('should cycle to previous terminal on Cmd+Shift+Left', () => {
      const terminals = [
        { id: 'term-1', type: NodeType.TERMINAL, data: {} },
        { id: 'term-2', type: NodeType.TERMINAL, data: {} },
      ];

      vi.mocked(useCanvasStore).mockReturnValue({
        nodes: terminals,
        selectedNodeId: 'term-2',
        setSelectedNode: mockSetSelectedNode,
        addNode: mockAddNode,
      } as unknown as ReturnType<typeof useCanvasStore>);

      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockSetSelectedNode).toHaveBeenCalledWith('term-1');
    });

    it('should jump to terminal by number (Cmd+1-9)', () => {
      const terminals = [
        { id: 'term-1', type: NodeType.TERMINAL, data: {} },
        { id: 'term-2', type: NodeType.TERMINAL, data: {} },
        { id: 'term-3', type: NodeType.TERMINAL, data: {} },
      ];

      vi.mocked(useCanvasStore).mockReturnValue({
        nodes: terminals,
        selectedNodeId: null,
        setSelectedNode: mockSetSelectedNode,
        addNode: mockAddNode,
      } as unknown as ReturnType<typeof useCanvasStore>);

      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: '2',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockSetSelectedNode).toHaveBeenCalledWith('term-2');
    });
  });

  describe('deselect', () => {
    it('should deselect on Escape', () => {
      vi.mocked(useCanvasStore).mockReturnValue({
        nodes: [],
        selectedNodeId: 'some-node',
        setSelectedNode: mockSetSelectedNode,
        addNode: mockAddNode,
      } as unknown as ReturnType<typeof useCanvasStore>);

      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockSetSelectedNode).toHaveBeenCalledWith(null);
    });
  });

  describe('create note', () => {
    it('should create note on N key when no input focused', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true,
      });
      // Simulate event target as body (not an input)
      Object.defineProperty(event, 'target', {
        value: document.body,
        writable: false,
      });
      window.dispatchEvent(event);

      expect(mockAddNode).toHaveBeenCalledWith(NodeType.NOTES, expect.any(Object));
    });

    it('should not create note when input is focused', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true,
      });
      Object.defineProperty(event, 'target', {
        value: input,
        writable: false,
      });
      window.dispatchEvent(event);

      expect(mockAddNode).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('disabled state', () => {
    it('should not handle any shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ enabled: false }));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockOpenCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('clear terminal callback', () => {
    it('should call onClearTerminal on Cmd+K when terminal is selected', () => {
      const mockClearTerminal = vi.fn();

      vi.mocked(useCanvasStore).mockReturnValue({
        nodes: [{ id: 'term-1', type: NodeType.TERMINAL, data: {} }],
        selectedNodeId: 'term-1',
        setSelectedNode: mockSetSelectedNode,
        addNode: mockAddNode,
      } as unknown as ReturnType<typeof useCanvasStore>);

      renderHook(() =>
        useKeyboardShortcuts({
          enabled: true,
          onClearTerminal: mockClearTerminal,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockClearTerminal).toHaveBeenCalled();
      expect(mockOpenCommandPalette).not.toHaveBeenCalled();
    });

    it('should open command palette on Cmd+K when no terminal selected', () => {
      const mockClearTerminal = vi.fn();

      vi.mocked(useCanvasStore).mockReturnValue({
        nodes: [],
        selectedNodeId: null,
        setSelectedNode: mockSetSelectedNode,
        addNode: mockAddNode,
      } as unknown as ReturnType<typeof useCanvasStore>);

      renderHook(() =>
        useKeyboardShortcuts({
          enabled: true,
          onClearTerminal: mockClearTerminal,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockClearTerminal).not.toHaveBeenCalled();
      expect(mockOpenCommandPalette).toHaveBeenCalledWith('commands');
    });
  });

  describe('returned functions', () => {
    it('should return navigation functions', () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ enabled: true }));

      expect(result.current.selectNextTerminal).toBeDefined();
      expect(result.current.selectPrevTerminal).toBeDefined();
      expect(result.current.selectTerminalByNumber).toBeDefined();
      expect(result.current.deselect).toBeDefined();
      expect(result.current.createNewNote).toBeDefined();
    });

    it('should call deselect when deselect function is called', () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ enabled: true }));

      act(() => {
        result.current.deselect();
      });

      expect(mockSetSelectedNode).toHaveBeenCalledWith(null);
    });
  });
});
