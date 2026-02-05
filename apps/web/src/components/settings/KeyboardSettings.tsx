/**
 * Keyboard Settings Component
 *
 * Settings for customizing keyboard shortcuts.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

export function KeyboardSettings() {
  const { shortcuts, updateShortcut, resetToDefaults } = useSettingsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.metaKey) keys.push('Cmd');

      // Don't record modifier-only presses
      const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key);
      if (!isModifierKey) {
        // Format key name
        let keyName = e.key;
        if (keyName === ' ') keyName = 'Space';
        if (keyName === 'Escape') keyName = 'Esc';
        if (keyName.length === 1) keyName = keyName.toUpperCase();

        keys.push(keyName);
      }

      // Only update if we have a key (not just modifiers)
      if (keys.length > 0 && !isModifierKey) {
        const combination = keys.join('+');
        updateShortcut(id, combination);
        setEditingId(null);
      }
    },
    [updateShortcut]
  );

  const handleBlur = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleResetAll = useCallback(() => {
    if (confirm('Reset all keyboard shortcuts to defaults?')) {
      resetToDefaults();
    }
  }, [resetToDefaults]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-medium"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            Keyboard Shortcuts
          </h3>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            Click on a shortcut to edit it. Press your desired key combination.
          </p>
        </div>
        <button
          onClick={handleResetAll}
          className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-theme-hover"
          style={{ color: 'rgb(var(--text-secondary))' }}
        >
          Reset All
        </button>
      </div>

      {/* Shortcuts List */}
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="flex items-center justify-between py-3 px-4 rounded-lg transition-colors"
            style={{
              backgroundColor:
                editingId === shortcut.id
                  ? 'rgb(var(--bg-tertiary))'
                  : 'transparent',
            }}
          >
            <div>
              <div
                className="text-sm font-medium"
                style={{ color: 'rgb(var(--text-primary))' }}
              >
                {shortcut.name}
              </div>
              <div
                className="text-xs"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                {shortcut.action}
              </div>
            </div>

            {editingId === shortcut.id ? (
              <input
                ref={inputRef}
                type="text"
                placeholder="Press keys..."
                onKeyDown={(e) => handleKeyDown(e, shortcut.id)}
                onBlur={handleBlur}
                readOnly
                className="px-3 py-1.5 text-sm rounded-lg border text-center w-40"
                style={{
                  backgroundColor: 'rgb(var(--bg-input))',
                  borderColor: 'rgb(var(--accent-primary))',
                  color: 'rgb(var(--text-secondary))',
                }}
                data-testid={`shortcut-input-${shortcut.id}`}
              />
            ) : (
              <button
                onClick={() => setEditingId(shortcut.id)}
                className="px-3 py-1.5 text-sm font-mono rounded-lg border transition-colors hover:border-opacity-60"
                style={{
                  backgroundColor: 'rgb(var(--bg-tertiary))',
                  borderColor: 'rgb(var(--border-primary))',
                  color: 'rgb(var(--text-secondary))',
                }}
                data-testid={`shortcut-${shortcut.id}`}
              >
                <kbd className="font-mono">{shortcut.keys}</kbd>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div
        className="p-4 rounded-lg text-sm"
        style={{
          backgroundColor: 'rgb(var(--bg-tertiary))',
          color: 'rgb(var(--text-muted))',
        }}
      >
        <p className="font-medium mb-2" style={{ color: 'rgb(var(--text-secondary))' }}>
          Tips:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Use modifier keys: Ctrl, Shift, Alt, Cmd (Mac)</li>
          <li>Press Escape to cancel editing</li>
          <li>Conflicting shortcuts may not work as expected</li>
          <li>Some system shortcuts cannot be overridden</li>
        </ul>
      </div>
    </div>
  );
}
