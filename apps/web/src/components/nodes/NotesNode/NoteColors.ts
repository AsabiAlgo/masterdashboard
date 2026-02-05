/**
 * Note Colors
 *
 * Color definitions for sticky note nodes.
 */

import type { NoteColor } from '@masterdashboard/shared';

export interface NoteColorConfig {
  /** Background color class */
  bg: string;
  /** Border color class */
  border: string;
  /** Header background color class */
  header: string;
  /** Text color class for dark text on light background */
  text: string;
  /** Folded corner color (darker shade) */
  fold: string;
  /** Folded corner shadow color */
  foldShadow: string;
}

/**
 * Color configurations for each note color
 */
export const NOTE_COLORS: Record<NoteColor, NoteColorConfig> = {
  yellow: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    header: 'bg-yellow-200',
    text: 'text-yellow-900',
    fold: '#fbbf24', // yellow-400
    foldShadow: '#d97706', // amber-600
  },
  blue: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    header: 'bg-blue-200',
    text: 'text-blue-900',
    fold: '#60a5fa', // blue-400
    foldShadow: '#2563eb', // blue-600
  },
  pink: {
    bg: 'bg-pink-100',
    border: 'border-pink-300',
    header: 'bg-pink-200',
    text: 'text-pink-900',
    fold: '#f472b6', // pink-400
    foldShadow: '#db2777', // pink-600
  },
  green: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    header: 'bg-green-200',
    text: 'text-green-900',
    fold: '#4ade80', // green-400
    foldShadow: '#16a34a', // green-600
  },
  purple: {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    header: 'bg-purple-200',
    text: 'text-purple-900',
    fold: '#c084fc', // purple-400
    foldShadow: '#9333ea', // purple-600
  },
};

/**
 * All available note colors
 */
export const NOTE_COLOR_OPTIONS: NoteColor[] = ['yellow', 'blue', 'pink', 'green', 'purple'];
