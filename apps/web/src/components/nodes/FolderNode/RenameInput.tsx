/**
 * Rename Input Component
 *
 * Inline input for renaming files and folders.
 */

'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { FileType, type FileEntry } from '@masterdashboard/shared';

interface RenameInputProps {
  entry: FileEntry;
  onRename: (newName: string) => void;
  onCancel: () => void;
}

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
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"|?*\u0000-\u001f]/;
  if (invalidChars.test(name)) {
    return 'Name contains invalid characters';
  }
  return null;
}

export const RenameInput = memo(function RenameInput({
  entry,
  onRename,
  onCancel,
}: RenameInputProps) {
  const [name, setName] = useState(entry.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDirectory = entry.type === FileType.DIRECTORY;

  // Focus and select appropriate text on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Select name without extension for files
      if (!isDirectory) {
        const dotIndex = entry.name.lastIndexOf('.');
        if (dotIndex > 0) {
          inputRef.current.setSelectionRange(0, dotIndex);
        } else {
          inputRef.current.select();
        }
      } else {
        inputRef.current.select();
      }
    }
  }, [entry.name, isDirectory]);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();

    // No change, just cancel
    if (trimmedName === entry.name) {
      onCancel();
      return;
    }

    const validationError = validateName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }

    onRename(trimmedName);
  }, [name, entry.name, onRename, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, onCancel]
  );

  const handleBlur = useCallback(() => {
    // Submit on blur unless there's an error
    if (!error) {
      handleSubmit();
    } else {
      onCancel();
    }
  }, [error, handleSubmit, onCancel]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`
          px-1 py-0.5 bg-slate-800 text-sm text-slate-200 rounded
          focus:outline-none focus:ring-1
          ${error ? 'ring-1 ring-red-500' : 'focus:ring-blue-500'}
        `}
        autoComplete="off"
        spellCheck={false}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
      {error && (
        <span className="text-xs text-red-400 mt-0.5">{error}</span>
      )}
    </div>
  );
});
