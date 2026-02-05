/**
 * Input Component
 *
 * Styled input component with label, placeholder, and error states.
 */

'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Left icon/element */
  leftElement?: ReactNode;
  /** Right icon/element */
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftElement,
    rightElement,
    className = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftElement && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2 text-sm
            bg-slate-800 border rounded-md
            text-slate-100 placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors truncate
            ${leftElement ? 'pl-9' : ''}
            ${rightElement ? 'pr-9' : ''}
            ${error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'}
            ${className}
          `}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />

        {rightElement && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
});
