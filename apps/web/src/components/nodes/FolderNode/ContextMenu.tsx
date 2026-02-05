/**
 * Context Menu Component
 *
 * Right-click menu for file actions.
 */

'use client';

import { memo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileType, FileAction, type FileEntry } from '@masterdashboard/shared';

// Extended action type for file operations
export type ExtendedFileAction = FileAction | 'rename' | 'delete' | 'cut' | 'copy' | 'paste';

interface ContextMenuProps {
  entry: FileEntry;
  position: { x: number; y: number };
  hasClipboard: boolean;
  onClose: () => void;
  onAction: (action: ExtendedFileAction) => void;
}

interface MenuItem {
  label: string;
  action: ExtendedFileAction;
  icon: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
}

// Icons
const FolderOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TerminalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const PasteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

export const ContextMenu = memo(function ContextMenu({
  entry,
  position,
  hasClipboard,
  onClose,
  onAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isDirectory = entry.type === FileType.DIRECTORY;
  const isExecutable = entry.isExecutable;

  // Build menu items based on file type
  const menuItems: (MenuItem | 'separator')[] = [
    { label: 'Open', action: FileAction.OPEN, icon: <FolderOpenIcon /> },
  ];

  if (!isDirectory) {
    menuItems.push({ label: 'Quick View', action: FileAction.QUICK_VIEW, icon: <EyeIcon /> });
  }

  if (isExecutable) {
    menuItems.push({ label: 'Execute', action: FileAction.EXECUTE, icon: <PlayIcon /> });
  }

  menuItems.push('separator');

  // Edit operations
  menuItems.push({ label: 'Rename', action: 'rename', icon: <EditIcon />, shortcut: 'F2' });
  menuItems.push({ label: 'Delete', action: 'delete', icon: <TrashIcon />, shortcut: 'Del' });

  menuItems.push('separator');

  // Clipboard operations
  menuItems.push({ label: 'Cut', action: 'cut', icon: <CutIcon />, shortcut: 'Ctrl+X' });
  menuItems.push({ label: 'Copy', action: 'copy', icon: <ClipboardIcon />, shortcut: 'Ctrl+C' });
  menuItems.push({
    label: 'Paste',
    action: 'paste',
    icon: <PasteIcon />,
    shortcut: 'Ctrl+V',
    disabled: !hasClipboard || !isDirectory,
  });

  menuItems.push('separator');
  menuItems.push({ label: 'Open in Terminal', action: FileAction.OPEN_IN_TERMINAL, icon: <TerminalIcon /> });
  menuItems.push({ label: 'Copy Path', action: FileAction.COPY_PATH, icon: <CopyIcon /> });
  menuItems.push('separator');
  menuItems.push({ label: 'Reveal in Finder', action: FileAction.REVEAL, icon: <ExternalLinkIcon /> });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${position.x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${position.y - rect.height}px`;
      }
    }
  }, [position]);

  const handleItemClick = useCallback(
    (action: ExtendedFileAction) => {
      onAction(action);
      onClose();
    },
    [onAction, onClose]
  );

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 text-sm"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) =>
        item === 'separator' ? (
          <div key={`sep-${index}`} className="h-px bg-slate-700 my-1" />
        ) : (
          <button
            key={item.action}
            className={`
              w-full flex items-center px-3 py-1.5 text-left
              hover:bg-slate-700 transition-colors
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !item.disabled && handleItemClick(item.action)}
            disabled={item.disabled}
          >
            <span className="w-5 h-5 mr-2 text-slate-400 flex items-center justify-center">
              {item.icon}
            </span>
            <span className="flex-1 text-slate-200">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-slate-500 ml-4">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>,
    document.body
  );
});
