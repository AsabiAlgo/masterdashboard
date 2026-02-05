/**
 * Delete Confirm Dialog Component
 *
 * Confirmation dialog for deleting files and folders.
 */

'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileType, type FileEntry } from '@masterdashboard/shared';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  items: FileEntry[];
  onClose: () => void;
  onConfirm: () => void;
}

const TrashIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  isOpen,
  items,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const fileCount = items.filter(i => i.type === FileType.FILE).length;
  const folderCount = items.filter(i => i.type === FileType.DIRECTORY).length;

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onConfirm();
        onClose();
      }
    },
    [onClose, onConfirm]
  );

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!isOpen || items.length === 0) return null;

  // Build description text
  let itemDescription = '';
  const firstItem = items[0];
  if (items.length === 1 && firstItem) {
    itemDescription = `"${firstItem.name}"`;
  } else {
    const parts: string[] = [];
    if (fileCount > 0) {
      parts.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`);
    }
    if (folderCount > 0) {
      parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`);
    }
    itemDescription = parts.join(' and ');
  }

  const hasFolders = folderCount > 0;

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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <span className="text-red-400">
            <TrashIcon />
          </span>
          <h3 className="text-sm font-medium text-slate-200">
            Delete {items.length === 1 ? 'Item' : 'Items'}
          </h3>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-sm text-slate-300 mb-3">
            Are you sure you want to delete {itemDescription}?
          </p>

          {hasFolders && (
            <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
              <WarningIcon />
              <span>
                Folders will be deleted recursively with all their contents.
              </span>
            </div>
          )}

          {items.length <= 5 && (
            <div className="mt-3 max-h-32 overflow-y-auto">
              <ul className="text-xs text-slate-400 space-y-1">
                {items.map((item) => (
                  <li key={item.path} className="flex items-center gap-1 truncate">
                    <span className={item.type === FileType.DIRECTORY ? 'text-yellow-400' : 'text-slate-500'}>
                      {item.type === FileType.DIRECTORY ? (
                        <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
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
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-500 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
