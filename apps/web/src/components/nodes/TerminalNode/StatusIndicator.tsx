/**
 * Status Indicator Component
 *
 * Visual indicator for terminal activity status with glow effects.
 * Shows working (green), waiting (yellow), error (red), or idle (gray) states.
 */

'use client';

import { useMemo } from 'react';
import { TerminalActivityStatus } from '@masterdashboard/shared';

interface StatusIndicatorProps {
  status: TerminalActivityStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  showLabel?: boolean;
}

interface StatusConfig {
  bg: string;
  glow: string;
  ring: string;
  label: string;
  textColor: string;
}

const STATUS_COLORS: Record<TerminalActivityStatus, StatusConfig> = {
  [TerminalActivityStatus.WORKING]: {
    bg: 'bg-green-500',
    glow: 'shadow-green-500/50',
    ring: 'ring-green-500/30',
    label: 'Working',
    textColor: 'text-green-400',
  },
  [TerminalActivityStatus.WAITING]: {
    bg: 'bg-yellow-500',
    glow: 'shadow-yellow-500/50',
    ring: 'ring-yellow-500/30',
    label: 'Waiting for input',
    textColor: 'text-yellow-400',
  },
  [TerminalActivityStatus.ERROR]: {
    bg: 'bg-red-500',
    glow: 'shadow-red-500/50',
    ring: 'ring-red-500/30',
    label: 'Error',
    textColor: 'text-red-400',
  },
  [TerminalActivityStatus.IDLE]: {
    bg: 'bg-gray-500',
    glow: 'shadow-gray-500/30',
    ring: 'ring-gray-500/20',
    label: 'Idle',
    textColor: 'text-gray-400',
  },
};

const SIZE_CLASSES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusIndicator({
  status,
  size = 'md',
  showPulse = true,
  showLabel = false,
}: StatusIndicatorProps) {
  const colors = STATUS_COLORS[status];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className="relative inline-flex items-center gap-2" title={colors.label}>
      <div className="relative">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-full blur-sm ${colors.bg} opacity-60`}
        />

        {/* Main dot */}
        <div
          className={`relative rounded-full ${sizeClass} ${colors.bg} shadow-lg ${colors.glow}`}
        />

        {/* Pulse animation for waiting status */}
        {showPulse && status === TerminalActivityStatus.WAITING && (
          <div
            className={`absolute inset-0 rounded-full animate-ping ${colors.bg} opacity-40`}
          />
        )}

        {/* Spin animation for working status */}
        {showPulse && status === TerminalActivityStatus.WORKING && (
          <div
            className={`absolute inset-0 rounded-full animate-pulse ${colors.bg} opacity-30`}
          />
        )}
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className={`text-xs ${colors.textColor}`}>{colors.label}</span>
      )}
    </div>
  );
}

interface StatusGlowProps {
  status: TerminalActivityStatus;
  children: React.ReactNode;
  className?: string;
}

/**
 * Glow wrapper for terminal nodes
 * Wraps content with a glowing border based on status
 */
export function StatusGlow({ status, children, className = '' }: StatusGlowProps) {
  const colors = STATUS_COLORS[status];

  const glowClasses = useMemo(() => {
    if (status === TerminalActivityStatus.IDLE) {
      return '';
    }

    return `ring-2 ${colors.ring} shadow-lg ${colors.glow}`;
  }, [status, colors]);

  return (
    <div
      className={`relative rounded-lg transition-all duration-300 ${glowClasses} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatusBadgeProps {
  status: TerminalActivityStatus;
  className?: string;
}

/**
 * Status badge showing current status as a pill
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
        ${colors.bg} bg-opacity-20 ${colors.textColor}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />
      {colors.label}
    </span>
  );
}
