/**
 * File Icon Component
 *
 * Renders file/folder icons with language-specific styling.
 */

'use client';

import { memo } from 'react';
import { FileType, FileCategory, getFileCategory, type FileEntry } from '@masterdashboard/shared';

interface FileIconProps {
  entry: FileEntry;
  size?: number;
}

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

// SVG Icons
const FolderIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
  </svg>
);

const FileIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

const CodeIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16,18 22,12 16,6" />
    <polyline points="8,6 2,12 8,18" />
  </svg>
);

const ImageIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
);

const ConfigIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const TerminalIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4,17 10,11 4,5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const DataIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const ArchiveIcon = ({ className, style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="21,8 21,21 3,21 3,8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

// Category to icon and color mapping
const CATEGORY_STYLES: Record<FileCategory, { icon: React.FC<IconProps>; color: string }> = {
  [FileCategory.FOLDER]: { icon: FolderIcon, color: 'text-yellow-400' },
  [FileCategory.TEXT]: { icon: FileIcon, color: 'text-slate-300' },
  [FileCategory.CODE]: { icon: CodeIcon, color: 'text-blue-400' },
  [FileCategory.IMAGE]: { icon: ImageIcon, color: 'text-green-400' },
  [FileCategory.VIDEO]: { icon: ImageIcon, color: 'text-pink-400' },
  [FileCategory.AUDIO]: { icon: FileIcon, color: 'text-orange-400' },
  [FileCategory.ARCHIVE]: { icon: ArchiveIcon, color: 'text-amber-400' },
  [FileCategory.DOCUMENT]: { icon: FileIcon, color: 'text-red-400' },
  [FileCategory.EXECUTABLE]: { icon: TerminalIcon, color: 'text-green-500' },
  [FileCategory.CONFIG]: { icon: ConfigIcon, color: 'text-purple-400' },
  [FileCategory.DATA]: { icon: DataIcon, color: 'text-cyan-400' },
  [FileCategory.UNKNOWN]: { icon: FileIcon, color: 'text-slate-500' },
};

// Extension-specific colors for common file types
const EXTENSION_COLORS: Record<string, string> = {
  '.ts': 'text-blue-400',
  '.tsx': 'text-blue-400',
  '.js': 'text-yellow-400',
  '.jsx': 'text-yellow-400',
  '.py': 'text-blue-500',
  '.go': 'text-cyan-400',
  '.rs': 'text-orange-400',
  '.json': 'text-yellow-300',
  '.md': 'text-slate-200',
  '.env': 'text-yellow-500',
  '.git': 'text-orange-500',
  '.svg': 'text-orange-400',
};

export const FileIconComponent = memo(function FileIconComponent({ entry, size = 16 }: FileIconProps) {
  const category = entry.type === FileType.DIRECTORY ? FileCategory.FOLDER : getFileCategory(entry);
  const { icon: Icon, color } = CATEGORY_STYLES[category];

  // Use extension-specific color if available
  const finalColor = entry.type === FileType.FILE
    ? (EXTENSION_COLORS[entry.extension.toLowerCase()] ?? color)
    : color;

  return (
    <Icon
      className={`flex-shrink-0 ${finalColor}`}
      style={{ width: size, height: size }}
    />
  );
});
