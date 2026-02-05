/**
 * File Types
 *
 * Types for file system operations and the FolderViewer node.
 */

/**
 * File entry type
 */
export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
  SYMLINK = 'symlink',
}

/**
 * File action types for launching files
 */
export enum FileAction {
  OPEN = 'open',
  EXECUTE = 'execute',
  REVEAL = 'reveal',
  COPY_PATH = 'copy_path',
  OPEN_IN_TERMINAL = 'open_in_terminal',
  QUICK_VIEW = 'quick_view',
}

/**
 * File category for icon mapping
 */
export enum FileCategory {
  FOLDER = 'folder',
  TEXT = 'text',
  CODE = 'code',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  DOCUMENT = 'document',
  EXECUTABLE = 'executable',
  CONFIG = 'config',
  DATA = 'data',
  UNKNOWN = 'unknown',
}

/**
 * File entry information returned from server
 */
export interface FileEntry {
  readonly name: string;
  readonly path: string;
  readonly type: FileType;
  readonly size: number;
  readonly modifiedAt: string;
  readonly createdAt: string;
  readonly extension: string;
  readonly isHidden: boolean;
  readonly isExecutable: boolean;
  readonly isReadable: boolean;
  readonly isWritable: boolean;
}

/**
 * Directory listing result
 */
export interface DirectoryListing {
  readonly path: string;
  readonly parentPath: string | null;
  readonly entries: FileEntry[];
  readonly totalCount: number;
  readonly hasMore: boolean;
}

/**
 * Tree node for hierarchical display
 */
export interface FileTreeNode {
  readonly entry: FileEntry;
  children: FileTreeNode[] | null;
  isLoading?: boolean;
}

/**
 * Sort field options
 */
export type SortField = 'name' | 'size' | 'modified' | 'type';

/**
 * Folder viewer configuration
 */
export interface FolderViewerConfig {
  readonly projectId: string;
  readonly initialPath: string;
  showHidden?: boolean;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Default folder viewer config
 */
export const DEFAULT_FOLDER_VIEWER_CONFIG = {
  showHidden: false,
  sortBy: 'name' as SortField,
  sortDirection: 'asc' as const,
} as const;

/**
 * Extension to category mapping
 */
export const FILE_CATEGORIES: Readonly<Record<string, FileCategory>> = {
  // Code
  '.ts': FileCategory.CODE,
  '.tsx': FileCategory.CODE,
  '.js': FileCategory.CODE,
  '.jsx': FileCategory.CODE,
  '.mjs': FileCategory.CODE,
  '.cjs': FileCategory.CODE,
  '.py': FileCategory.CODE,
  '.go': FileCategory.CODE,
  '.rs': FileCategory.CODE,
  '.java': FileCategory.CODE,
  '.c': FileCategory.CODE,
  '.cpp': FileCategory.CODE,
  '.h': FileCategory.CODE,
  '.hpp': FileCategory.CODE,
  '.rb': FileCategory.CODE,
  '.php': FileCategory.CODE,
  '.swift': FileCategory.CODE,
  '.kt': FileCategory.CODE,
  '.scala': FileCategory.CODE,
  '.vue': FileCategory.CODE,
  '.svelte': FileCategory.CODE,
  '.astro': FileCategory.CODE,
  '.cs': FileCategory.CODE,

  // Text
  '.txt': FileCategory.TEXT,
  '.md': FileCategory.TEXT,
  '.mdx': FileCategory.TEXT,
  '.rst': FileCategory.TEXT,
  '.rtf': FileCategory.TEXT,

  // Config
  '.json': FileCategory.CONFIG,
  '.yaml': FileCategory.CONFIG,
  '.yml': FileCategory.CONFIG,
  '.toml': FileCategory.CONFIG,
  '.ini': FileCategory.CONFIG,
  '.env': FileCategory.CONFIG,
  '.conf': FileCategory.CONFIG,
  '.config': FileCategory.CONFIG,
  '.lock': FileCategory.CONFIG,
  '.editorconfig': FileCategory.CONFIG,
  '.prettierrc': FileCategory.CONFIG,
  '.eslintrc': FileCategory.CONFIG,

  // Data
  '.csv': FileCategory.DATA,
  '.xml': FileCategory.DATA,
  '.sql': FileCategory.DATA,
  '.graphql': FileCategory.DATA,
  '.gql': FileCategory.DATA,
  '.prisma': FileCategory.DATA,

  // Documents
  '.pdf': FileCategory.DOCUMENT,
  '.doc': FileCategory.DOCUMENT,
  '.docx': FileCategory.DOCUMENT,
  '.xls': FileCategory.DOCUMENT,
  '.xlsx': FileCategory.DOCUMENT,
  '.ppt': FileCategory.DOCUMENT,
  '.pptx': FileCategory.DOCUMENT,

  // Images
  '.png': FileCategory.IMAGE,
  '.jpg': FileCategory.IMAGE,
  '.jpeg': FileCategory.IMAGE,
  '.gif': FileCategory.IMAGE,
  '.svg': FileCategory.IMAGE,
  '.webp': FileCategory.IMAGE,
  '.ico': FileCategory.IMAGE,
  '.bmp': FileCategory.IMAGE,
  '.avif': FileCategory.IMAGE,

  // Video
  '.mp4': FileCategory.VIDEO,
  '.webm': FileCategory.VIDEO,
  '.mov': FileCategory.VIDEO,
  '.avi': FileCategory.VIDEO,
  '.mkv': FileCategory.VIDEO,

  // Audio
  '.mp3': FileCategory.AUDIO,
  '.wav': FileCategory.AUDIO,
  '.ogg': FileCategory.AUDIO,
  '.flac': FileCategory.AUDIO,
  '.aac': FileCategory.AUDIO,

  // Archives
  '.zip': FileCategory.ARCHIVE,
  '.tar': FileCategory.ARCHIVE,
  '.gz': FileCategory.ARCHIVE,
  '.rar': FileCategory.ARCHIVE,
  '.7z': FileCategory.ARCHIVE,
  '.bz2': FileCategory.ARCHIVE,
  '.xz': FileCategory.ARCHIVE,

  // Executables
  '.sh': FileCategory.EXECUTABLE,
  '.bash': FileCategory.EXECUTABLE,
  '.zsh': FileCategory.EXECUTABLE,
  '.fish': FileCategory.EXECUTABLE,
  '.exe': FileCategory.EXECUTABLE,
  '.bin': FileCategory.EXECUTABLE,
  '.app': FileCategory.EXECUTABLE,
} as const;

/**
 * File extensions recognized as text files (can be opened in viewer)
 */
export const TEXT_FILE_EXTENSIONS = [
  '.txt', '.md', '.mdx', '.json', '.yaml', '.yml', '.xml', '.html', '.htm',
  '.css', '.scss', '.less', '.sass', '.js', '.jsx', '.ts', '.tsx', '.vue',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.php', '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.graphql', '.toml', '.ini', '.conf', '.env', '.gitignore',
  '.dockerfile', '.makefile', '.cmake', '.gradle', '.log', '.csv',
] as const;

/**
 * File extensions that are executable scripts
 */
export const EXECUTABLE_EXTENSIONS = [
  '.sh', '.bash', '.zsh', '.fish', '.py', '.rb', '.pl', '.js', '.ts',
] as const;

/**
 * Keyboard shortcuts for file viewer
 */
export const FILE_VIEWER_SHORTCUTS = {
  NAVIGATE_UP: 'ArrowUp',
  NAVIGATE_DOWN: 'ArrowDown',
  EXPAND: 'ArrowRight',
  COLLAPSE: 'ArrowLeft',
  OPEN: 'Enter',
  BACK: 'Backspace',
  SEARCH: 'ctrl+f',
  SELECT_ALL: 'ctrl+a',
  COPY_PATH: 'ctrl+c',
  REFRESH: 'ctrl+r',
  TOGGLE_HIDDEN: 'ctrl+h',
  DELETE: 'Delete',
  RENAME: 'F2',
  NEW_FILE: 'ctrl+n',
  NEW_FOLDER: 'ctrl+shift+n',
} as const;

/**
 * Get file category from file entry
 */
export function getFileCategory(entry: FileEntry): FileCategory {
  if (entry.type === FileType.DIRECTORY) {
    return FileCategory.FOLDER;
  }
  if (entry.isExecutable) {
    return FileCategory.EXECUTABLE;
  }
  return FILE_CATEGORIES[entry.extension.toLowerCase()] ?? FileCategory.UNKNOWN;
}

/**
 * Check if file is a text file
 */
export function isTextFile(extension: string): boolean {
  return TEXT_FILE_EXTENSIONS.includes(
    extension.toLowerCase() as (typeof TEXT_FILE_EXTENSIONS)[number]
  );
}

/**
 * Check if file is an executable script
 */
export function isExecutableScript(extension: string): boolean {
  return EXECUTABLE_EXTENSIONS.includes(
    extension.toLowerCase() as (typeof EXECUTABLE_EXTENSIONS)[number]
  );
}
