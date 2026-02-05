/**
 * Create Dialog Component
 *
 * Modal dialog for creating new files or folders.
 */

'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CreateDialogProps {
  isOpen: boolean;
  type: 'file' | 'folder';
  currentPath: string;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Name cannot be empty';
  }
  if (name.length > 255) {
    return 'Name is too long (max 255 characters)';
  }
  if (name.includes('/') || name.includes('\\')) {
    return 'Name cannot contain slashes';
  }
  if (name === '.' || name === '..') {
    return 'Invalid name';
  }
  // Check for other invalid characters on common file systems
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"|?*\u0000-\u001f]/;
  if (invalidChars.test(name)) {
    return 'Name contains invalid characters';
  }
  return null;
}

export const CreateDialog = memo(function CreateDialog({
  isOpen,
  type,
  currentPath,
  onClose,
  onCreate,
}: CreateDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(type === 'file' ? 'untitled.txt' : 'New Folder');
      setError(null);
      // Focus input and select text
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select name without extension for files
          if (type === 'file') {
            const dotIndex = inputRef.current.value.lastIndexOf('.');
            if (dotIndex > 0) {
              inputRef.current.setSelectionRange(0, dotIndex);
            } else {
              inputRef.current.select();
            }
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, type]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      const validationError = validateName(trimmedName);
      if (validationError) {
        setError(validationError);
        return;
      }
      onCreate(trimmedName);
      onClose();
    },
    [name, onCreate, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <span className="text-yellow-400">
            {type === 'file' ? <FileIcon /> : <FolderIcon />}
          </span>
          <h3 className="text-sm font-medium text-slate-200">
            New {type === 'file' ? 'File' : 'Folder'}
          </h3>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-4">
            <label className="block text-xs text-slate-400 mb-1">
              Creating in: <span className="text-slate-300">{currentPath}</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={handleNameChange}
              className={`
                w-full px-3 py-2 bg-slate-900 border rounded text-sm text-slate-200
                focus:outline-none focus:ring-1
                ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-blue-500'}
              `}
              placeholder={type === 'file' ? 'filename.ext' : 'Folder name'}
              autoComplete="off"
              spellCheck={false}
            />
            {error && (
              <p className="mt-1 text-xs text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-500 rounded transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
});
