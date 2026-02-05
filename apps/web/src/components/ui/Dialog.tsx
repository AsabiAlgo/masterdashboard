/**
 * Dialog Component
 *
 * Modal dialog with backdrop, controlled open/close, and consistent styling.
 */

'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Dialog content */
  children: ReactNode;
  /** Optional footer content (buttons) */
  footer?: ReactNode;
  /** Dialog width */
  width?: 'sm' | 'md' | 'lg';
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'md',
}: DialogProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`
          relative w-full ${widthClasses[width]} mx-4
          bg-slate-900 border border-slate-700
          rounded-lg shadow-2xl
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-slate-100"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            aria-label="Close dialog"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700 bg-slate-800/50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render in portal
  if (typeof document !== 'undefined') {
    return createPortal(dialog, document.body);
  }

  return null;
}
