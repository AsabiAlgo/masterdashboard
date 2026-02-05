/**
 * Search Bar Component
 *
 * File search input for folder viewer.
 */

'use client';

import { memo, useRef, useEffect, useState, useCallback } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onClear: () => void;
  resultCount?: number;
  isSearching: boolean;
}

const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export const SearchBar = memo(function SearchBar({
  value,
  onChange,
  onClear,
  resultCount,
  isSearching,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced change handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the onChange callback
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 200);
  }, [onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <div className="flex items-center px-2 py-1.5 bg-slate-800 border-b border-slate-700 gap-2">
      <SearchIcon />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search files..."
        className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none min-w-0"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {isSearching && <Spinner />}
      {resultCount !== undefined && !isSearching && localValue && (
        <span className="text-xs text-slate-500 flex-shrink-0">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </span>
      )}
      {localValue && (
        <button
          className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors"
          onClick={handleClear}
          title="Clear search (Escape)"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
});
