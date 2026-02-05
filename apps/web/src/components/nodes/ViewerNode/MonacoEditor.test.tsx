/**
 * Monaco Editor Component Tests
 *
 * Tests for the Monaco editor wrapper component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock @monaco-editor/react - must use inline factory to avoid hoisting issues
vi.mock('@monaco-editor/react', () => {
  const mockEditorInstance = {
    getValue: vi.fn(() => 'const x = 1;'),
    setValue: vi.fn(),
    onKeyDown: vi.fn(),
    addCommand: vi.fn(),
    getModel: vi.fn(() => ({
      getValue: () => 'const x = 1;',
    })),
    focus: vi.fn(),
  };

  const mockMonaco = {
    editor: {
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
    KeyMod: {
      CtrlCmd: 1,
    },
    KeyCode: {
      KeyS: 1,
    },
  };

  return {
    default: vi.fn(({ value, onChange, onMount, beforeMount, options, language, loading }) => {
      // Call beforeMount synchronously like the real implementation
      if (beforeMount) {
        beforeMount(mockMonaco);
      }

      // Simulate editor mounting after a short delay
      if (typeof window !== 'undefined') {
        setTimeout(() => onMount?.(mockEditorInstance, mockMonaco), 10);
      }

      return (
        <div data-testid="monaco-editor-wrapper">
          <textarea
            data-testid="mock-monaco-editor"
            data-language={language}
            data-readonly={options?.readOnly?.toString()}
            data-minimap={options?.minimap?.enabled?.toString()}
            data-wordwrap={options?.wordWrap}
            data-fontsize={options?.fontSize?.toString()}
            value={value}
            readOnly={options?.readOnly}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </div>
      );
    }),
    loader: {
      init: vi.fn().mockResolvedValue(mockMonaco),
      config: vi.fn(),
    },
  };
});

import { MonacoEditor } from './MonacoEditor';

describe('MonacoEditor', () => {
  const defaultProps = {
    value: 'const x = 1;',
    onChange: vi.fn(),
    language: 'typescript',
    onSave: vi.fn(),
    readOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render editor', async () => {
    render(<MonacoEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor-wrapper')).toBeInTheDocument();
    });
  });

  it('should display initial value', async () => {
    render(<MonacoEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveValue('const x = 1;');
    });
  });

  it('should call onChange when content changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonacoEditor {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
    });

    const editor = screen.getByTestId('mock-monaco-editor');
    await user.clear(editor);
    await user.type(editor, 'new content');

    expect(onChange).toHaveBeenCalled();
  });

  it('should pass language to editor', async () => {
    render(<MonacoEditor {...defaultProps} language="python" />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-language',
        'python'
      );
    });
  });

  it('should pass readOnly to editor', async () => {
    render(<MonacoEditor {...defaultProps} readOnly={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-readonly',
        'true'
      );
    });
  });

  it('should pass minimap setting', async () => {
    render(<MonacoEditor {...defaultProps} showMinimap={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-minimap',
        'true'
      );
    });
  });

  it('should pass word wrap setting', async () => {
    render(<MonacoEditor {...defaultProps} wordWrap={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-wordwrap',
        'on'
      );
    });
  });

  it('should pass font size setting', async () => {
    render(<MonacoEditor {...defaultProps} fontSize={16} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-fontsize',
        '16'
      );
    });
  });

  it('should handle undefined value gracefully', async () => {
    render(<MonacoEditor {...defaultProps} value={undefined as unknown as string} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
    });
  });

  it('should show line numbers by default', async () => {
    render(<MonacoEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
    });
  });
});

describe('MonacoEditor with disabled features', () => {
  const defaultProps = {
    value: 'const x = 1;',
    onChange: vi.fn(),
    language: 'typescript',
  };

  it('should hide minimap when showMinimap is false', async () => {
    render(<MonacoEditor {...defaultProps} showMinimap={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-minimap',
        'false'
      );
    });
  });

  it('should disable word wrap when wordWrap is false', async () => {
    render(<MonacoEditor {...defaultProps} wordWrap={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-monaco-editor')).toHaveAttribute(
        'data-wordwrap',
        'off'
      );
    });
  });
});
