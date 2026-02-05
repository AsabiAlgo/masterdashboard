/**
 * Node Handle Component
 *
 * Custom styled handle for node connections.
 */

'use client';

import { Handle, Position, type HandleProps } from '@xyflow/react';

interface NodeHandleProps extends Omit<HandleProps, 'type' | 'position'> {
  /** Handle type: source or target */
  type: 'source' | 'target';
  /** Handle position */
  position: Position;
  /** Handle color */
  color?: string;
  /** Handle size */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: '!w-2 !h-2',
  md: '!w-3 !h-3',
  lg: '!w-4 !h-4',
};

export function NodeHandle({
  type,
  position,
  color = 'bg-slate-500',
  size = 'md',
  className = '',
  ...props
}: NodeHandleProps) {
  return (
    <Handle
      type={type}
      position={position}
      className={`
        ${sizeClasses[size]}
        !${color}
        !border-2 !border-slate-400
        hover:!border-blue-400
        transition-colors
        ${className}
      `}
      {...props}
    />
  );
}
