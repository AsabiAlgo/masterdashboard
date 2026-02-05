/**
 * Panel Component
 *
 * Reusable panel container with consistent styling.
 */

'use client';

import { type ReactNode } from 'react';

interface PanelProps {
  /** Panel content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Panel padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export function Panel({
  children,
  className = '',
  padding = 'md',
}: PanelProps) {
  return (
    <div
      className={`
        bg-slate-900/95 backdrop-blur-sm
        rounded-lg shadow-xl
        border border-slate-700
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
