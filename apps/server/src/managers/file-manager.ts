/**
 * File Manager
 *
 * Manages file system operations for the FolderViewer node.
 * Implements security restrictions to prevent access outside allowed paths.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { constants } from 'fs';
import { watch, type FSWatcher } from 'fs';
import {
  FileType,
  FileCategory,
  FILE_CATEGORIES,
  type FileEntry,
  type FileTreeNode,
  type DirectoryListing,
  type SortField,
} from '@masterdashboard/shared';
import { createChildLogger } from '../utils/logger.js';
import { FileNotFoundError, FileAccessDeniedError, FileOperationError } from '../utils/errors.js';

const logger = createChildLogger('file-manager');

interface FileManagerOptions {
  /** Allowed root paths (cannot navigate above these) */
  allowedRoots?: string[];
  /** Maximum search results */
  maxSearchResults?: number;
  /** Maximum entries per directory listing */
  maxEntries?: number;
  /** Whether to follow symlinks */
  followSymlinks?: boolean;
}

interface ListOptions {
  showHidden?: boolean;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface SearchOptions {
  maxResults?: number;
  includeHidden?: boolean;
  fileTypes?: string[];
}

interface FileWatchCallback {
  (event: { path: string; event: 'created' | 'modified' | 'deleted' | 'renamed'; oldPath?: string }): void;
}

export class FileManager extends EventEmitter {
  private allowedRoots: Set<string>;
  private maxSearchResults: number;
  private maxEntries: number;
  private followSymlinks: boolean;
  private watchers = new Map<string, FSWatcher>();

  constructor(options: FileManagerOptions = {}) {
    super();
    this.allowedRoots = new Set(
      (options.allowedRoots ?? [process.env.HOME ?? '/']).map(p => path.resolve(p))
    );
    this.maxSearchResults = options.maxSearchResults ?? 100;
    this.maxEntries = options.maxEntries ?? 1000;
    // followSymlinks is stored for potential future use
    this.followSymlinks = options.followSymlinks ?? true;
    void this.followSymlinks; // Mark as intentionally unused for now

    logger.info(
      { allowedRoots: Array.from(this.allowedRoots) },
      'File manager initialized'
    );
  }

  /**
   * Add an allowed root path
   */
  addAllowedRoot(rootPath: string): void {
    const normalized = path.resolve(rootPath);
    this.allowedRoots.add(normalized);
    logger.info({ rootPath: normalized }, 'Added allowed root');
  }

  /**
   * Check if a path is within allowed roots
   */
  private isPathAllowed(targetPath: string): boolean {
    const normalized = path.resolve(targetPath);
    for (const root of this.allowedRoots) {
      if (normalized === root || normalized.startsWith(root + path.sep)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a path is an allowed root (cannot be deleted/renamed)
   */
  private isRootPath(targetPath: string): boolean {
    const normalized = path.resolve(targetPath);
    return this.allowedRoots.has(normalized);
  }

  /**
   * Validate a file/folder name for security
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new FileOperationError('validate', name, 'Name cannot be empty');
    }
    if (name.length > 255) {
      throw new FileOperationError('validate', name, 'Name exceeds maximum length of 255 characters');
    }
    if (name.includes('/') || name.includes('\\')) {
      throw new FileOperationError('validate', name, 'Name cannot contain path separators');
    }
    if (name === '.' || name === '..') {
      throw new FileOperationError('validate', name, 'Invalid name');
    }
  }

  /**
   * Validate and resolve a path
   */
  private async validatePath(targetPath: string): Promise<string> {
    const resolved = path.resolve(targetPath);

    if (!this.isPathAllowed(resolved)) {
      throw new FileAccessDeniedError(targetPath, 'Path is outside allowed directories');
    }

    // Check for path traversal attempts via symlinks
    if (targetPath.includes('..')) {
      try {
        const realPath = await fs.realpath(resolved);
        if (!this.isPathAllowed(realPath)) {
          throw new FileAccessDeniedError(targetPath, 'Path traversal detected');
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new FileNotFoundError(targetPath);
        }
        throw error;
      }
    }

    return resolved;
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string, options: ListOptions = {}): Promise<DirectoryListing> {
    const {
      showHidden = false,
      sortBy = 'name',
      sortDirection = 'asc',
      limit = 100,
      offset = 0,
    } = options;

    const validatedPath = await this.validatePath(dirPath);

    // Check if path exists and is readable
    try {
      await fs.access(validatedPath, constants.R_OK);
    } catch {
      throw new FileNotFoundError(dirPath);
    }

    const stat = await fs.stat(validatedPath);
    if (!stat.isDirectory()) {
      throw new FileAccessDeniedError(dirPath, 'Not a directory');
    }

    // Read directory entries
    const dirEntries = await fs.readdir(validatedPath, { withFileTypes: true });

    // Filter and map entries
    const entries: FileEntry[] = [];
    for (const dirent of dirEntries) {
      // Skip hidden files if not requested
      if (!showHidden && dirent.name.startsWith('.')) {
        continue;
      }

      // Limit total entries
      if (entries.length >= this.maxEntries) {
        break;
      }

      const entryPath = path.join(validatedPath, dirent.name);

      try {
        const entry = await this.getFileEntry(entryPath, dirent);
        entries.push(entry);
      } catch (error) {
        // Skip entries we can't read (permission denied, etc.)
        logger.debug({ path: entryPath, error }, 'Skipping unreadable entry');
      }
    }

    // Sort entries
    const sortedEntries = this.sortEntries(entries, sortBy, sortDirection);

    // Calculate parent path
    const parentPath = this.getParentPath(validatedPath);

    // Apply pagination
    const totalCount = sortedEntries.length;
    const hasMore = offset + limit < totalCount;
    const paginatedEntries = sortedEntries.slice(offset, offset + limit);

    return {
      path: validatedPath,
      parentPath,
      entries: paginatedEntries,
      totalCount,
      hasMore,
    };
  }

  /**
   * Get file entry information
   */
  private async getFileEntry(filePath: string, dirent?: { name: string; isDirectory(): boolean; isSymbolicLink(): boolean }): Promise<FileEntry> {
    const stat = await fs.stat(filePath);
    const name = path.basename(filePath);

    let fileType: FileType;
    if (dirent) {
      if (dirent.isDirectory()) fileType = FileType.DIRECTORY;
      else if (dirent.isSymbolicLink()) fileType = FileType.SYMLINK;
      else fileType = FileType.FILE;
    } else {
      if (stat.isDirectory()) fileType = FileType.DIRECTORY;
      else if (stat.isSymbolicLink()) fileType = FileType.SYMLINK;
      else fileType = FileType.FILE;
    }

    const extension = fileType === FileType.FILE ? path.extname(name).toLowerCase() : '';

    // Check if executable
    let isExecutable = false;
    if (fileType === FileType.FILE) {
      try {
        await fs.access(filePath, constants.X_OK);
        isExecutable = true;
      } catch {
        // Not executable
      }
    }

    // Check if readable
    let isReadable = true;
    try {
      await fs.access(filePath, constants.R_OK);
    } catch {
      isReadable = false;
    }

    // Check if writable
    let isWritable = true;
    try {
      await fs.access(filePath, constants.W_OK);
    } catch {
      isWritable = false;
    }

    return {
      name,
      path: filePath,
      type: fileType,
      size: fileType === FileType.FILE ? stat.size : 0,
      modifiedAt: stat.mtime.toISOString(),
      createdAt: stat.birthtime.toISOString(),
      extension,
      isHidden: name.startsWith('.'),
      isExecutable,
      isReadable,
      isWritable,
    };
  }

  /**
   * Get single file/directory info
   */
  async getFileInfo(filePath: string): Promise<FileEntry> {
    const validatedPath = await this.validatePath(filePath);

    try {
      await fs.access(validatedPath, constants.R_OK);
    } catch {
      throw new FileNotFoundError(filePath);
    }

    return this.getFileEntry(validatedPath);
  }

  /**
   * Get file tree for hierarchical display
   */
  async getFileTree(
    rootPath: string,
    depth: number = 1,
    showHidden: boolean = false
  ): Promise<FileTreeNode> {
    const validatedPath = await this.validatePath(rootPath);
    const rootEntry = await this.getFileEntry(validatedPath);

    const buildTree = async (entry: FileEntry, currentDepth: number): Promise<FileTreeNode> => {
      const node: FileTreeNode = {
        entry,
        children: null,
      };

      if (entry.type === FileType.DIRECTORY && currentDepth < depth) {
        try {
          const listing = await this.listDirectory(entry.path, { showHidden, limit: 500 });
          node.children = await Promise.all(
            listing.entries.map(child => buildTree(child, currentDepth + 1))
          );
        } catch {
          // Permission denied or error - leave children as null
          node.children = [];
        }
      }

      return node;
    };

    return buildTree(rootEntry, 0);
  }

  /**
   * Search files by name (fuzzy matching)
   */
  async searchFiles(
    rootPath: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<{ results: FileEntry[]; totalMatches: number; truncated: boolean }> {
    const validatedPath = await this.validatePath(rootPath);
    const results: FileEntry[] = [];
    const maxResults = options.maxResults ?? this.maxSearchResults;
    const lowerQuery = query.toLowerCase();

    const search = async (dirPath: string): Promise<void> => {
      if (results.length >= maxResults) return;

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const dirent of entries) {
          if (results.length >= maxResults) break;

          // Skip hidden unless requested
          if (!options.includeHidden && dirent.name.startsWith('.')) continue;

          const fullPath = path.join(dirPath, dirent.name);

          // Check if name matches query (fuzzy)
          if (this.fuzzyMatch(dirent.name.toLowerCase(), lowerQuery)) {
            try {
              const entry = await this.getFileEntry(fullPath, dirent);

              // Filter by file type if specified
              if (!options.fileTypes || options.fileTypes.length === 0 ||
                  options.fileTypes.includes(entry.extension)) {
                results.push(entry);
              }
            } catch {
              // Skip unreadable entries
            }
          }

          // Recurse into directories
          if (dirent.isDirectory() && results.length < maxResults) {
            await search(fullPath);
          }
        }
      } catch {
        // Permission denied or other error - skip directory
      }
    };

    await search(validatedPath);

    return {
      results,
      totalMatches: results.length,
      truncated: results.length >= maxResults,
    };
  }

  /**
   * Simple fuzzy matching (checks if query chars appear in order)
   */
  private fuzzyMatch(text: string, query: string): boolean {
    if (query.length === 0) return true;
    if (text.length === 0) return false;

    // Check for exact substring first (faster common case)
    if (text.includes(query)) return true;

    // Fuzzy match - chars in order
    let queryIndex = 0;
    for (const char of text) {
      if (char === query[queryIndex]) {
        queryIndex++;
        if (queryIndex === query.length) return true;
      }
    }
    return queryIndex === query.length;
  }

  /**
   * Read file content
   */
  async readFileContent(
    filePath: string,
    options: { startLine?: number; endLine?: number; maxBytes?: number } = {}
  ): Promise<{ content: string; totalLines: number; truncated: boolean; encoding: string }> {
    const validatedPath = await this.validatePath(filePath);
    const stat = await fs.stat(validatedPath);

    if (stat.isDirectory()) {
      throw new FileOperationError('read', filePath, 'Cannot read directory as file');
    }

    const maxBytes = options.maxBytes ?? 1024 * 1024; // 1MB default
    const truncated = stat.size > maxBytes;

    // Read file
    const buffer = await fs.readFile(validatedPath);
    const content = buffer.toString('utf-8').slice(0, maxBytes);
    const lines = content.split('\n');

    // Apply line range if specified
    let resultContent = content;
    if (options.startLine !== undefined || options.endLine !== undefined) {
      const start = options.startLine ?? 0;
      const end = options.endLine ?? lines.length;
      resultContent = lines.slice(start, end).join('\n');
    }

    return {
      content: resultContent,
      totalLines: lines.length,
      truncated,
      encoding: 'utf-8',
    };
  }

  /**
   * Get file category
   */
  getFileCategory(entry: FileEntry): FileCategory {
    if (entry.type === FileType.DIRECTORY) {
      return FileCategory.FOLDER;
    }
    if (entry.isExecutable) {
      return FileCategory.EXECUTABLE;
    }
    return FILE_CATEGORIES[entry.extension.toLowerCase()] ?? FileCategory.UNKNOWN;
  }

  /**
   * Detect language for syntax highlighting
   */
  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.rb': 'ruby',
      '.php': 'php',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.md': 'markdown',
      '.mdx': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.gql': 'graphql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'bash',
      '.fish': 'fish',
      '.ps1': 'powershell',
      '.toml': 'toml',
      '.ini': 'ini',
      '.env': 'dotenv',
      '.dockerfile': 'dockerfile',
      '.vue': 'vue',
      '.svelte': 'svelte',
    };
    return languageMap[ext] ?? 'plaintext';
  }

  /**
   * Watch directory for changes
   */
  watchDirectory(dirPath: string, callback: FileWatchCallback): () => void {
    const validatedPath = path.resolve(dirPath);

    // Check if already watching
    if (this.watchers.has(validatedPath)) {
      logger.warn({ path: validatedPath }, 'Already watching directory');
    }

    const watcher = watch(validatedPath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        const fullPath = path.join(validatedPath, filename);
        callback({
          path: fullPath,
          event: eventType === 'rename' ? 'created' : 'modified',
        });
      }
    });

    this.watchers.set(validatedPath, watcher);

    logger.info({ path: validatedPath }, 'Started watching directory');

    return () => {
      watcher.close();
      this.watchers.delete(validatedPath);
      logger.info({ path: validatedPath }, 'Stopped watching directory');
    };
  }

  /**
   * Sort entries
   */
  private sortEntries(
    entries: FileEntry[],
    sortBy: SortField,
    direction: 'asc' | 'desc'
  ): FileEntry[] {
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...entries].sort((a, b) => {
      // Directories always come first
      if (a.type === FileType.DIRECTORY && b.type !== FileType.DIRECTORY) return -1;
      if (a.type !== FileType.DIRECTORY && b.type === FileType.DIRECTORY) return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modified':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'type':
          comparison = a.extension.localeCompare(b.extension);
          break;
      }

      return comparison * multiplier;
    });
  }

  /**
   * Get parent directory path
   */
  private getParentPath(dirPath: string): string | null {
    const parent = path.dirname(dirPath);
    if (parent === dirPath || !this.isPathAllowed(parent)) {
      return null;
    }
    return parent;
  }

  /**
   * Read binary file as base64 (for images)
   */
  async readFileAsBase64(
    filePath: string,
    maxBytes: number = 10 * 1024 * 1024 // 10MB default
  ): Promise<{ data: string; mimeType: string; size: number; truncated: boolean }> {
    const validatedPath = await this.validatePath(filePath);
    const stat = await fs.stat(validatedPath);

    if (stat.isDirectory()) {
      throw new FileOperationError('read', filePath, 'Cannot read directory as file');
    }

    const truncated = stat.size > maxBytes;

    // Determine MIME type from extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
    };
    const mimeType = mimeTypes[ext] ?? 'application/octet-stream';

    // Read file as buffer
    const buffer = await fs.readFile(validatedPath);
    const data = buffer.slice(0, maxBytes).toString('base64');

    logger.debug({ path: filePath, size: stat.size, mimeType }, 'Read file as base64');

    return {
      data,
      mimeType,
      size: stat.size,
      truncated,
    };
  }

  /**
   * Write file content
   */
  async writeFileContent(
    filePath: string,
    content: string,
    options: { createDirectories?: boolean; encoding?: BufferEncoding } = {}
  ): Promise<{ success: boolean; bytesWritten: number }> {
    const validatedPath = await this.validatePath(filePath);
    const { createDirectories = false, encoding = 'utf-8' } = options;

    // Create parent directories if requested
    if (createDirectories) {
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true });
    }

    // Write file
    await fs.writeFile(validatedPath, content, { encoding });
    const bytesWritten = Buffer.byteLength(content, encoding);

    logger.info({ path: filePath, bytesWritten }, 'Wrote file content');

    return {
      success: true,
      bytesWritten,
    };
  }

  /**
   * Create a new file
   */
  async createFile(
    parentPath: string,
    name: string,
    content: string = ''
  ): Promise<{ path: string; entry: FileEntry }> {
    this.validateName(name);
    const validatedParent = await this.validatePath(parentPath);

    // Check parent is a directory
    const parentStat = await fs.stat(validatedParent);
    if (!parentStat.isDirectory()) {
      throw new FileOperationError('create', parentPath, 'Parent path is not a directory');
    }

    const filePath = path.join(validatedParent, name);

    // Check file doesn't already exist
    try {
      await fs.access(filePath);
      throw new FileOperationError('create', filePath, 'File already exists');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Create file
    await fs.writeFile(filePath, content, { encoding: 'utf-8' });
    const entry = await this.getFileEntry(filePath);

    logger.info({ path: filePath }, 'Created file');
    return { path: filePath, entry };
  }

  /**
   * Create a new folder
   */
  async createFolder(
    parentPath: string,
    name: string
  ): Promise<{ path: string; entry: FileEntry }> {
    this.validateName(name);
    const validatedParent = await this.validatePath(parentPath);

    // Check parent is a directory
    const parentStat = await fs.stat(validatedParent);
    if (!parentStat.isDirectory()) {
      throw new FileOperationError('createFolder', parentPath, 'Parent path is not a directory');
    }

    const folderPath = path.join(validatedParent, name);

    // Check folder doesn't already exist
    try {
      await fs.access(folderPath);
      throw new FileOperationError('createFolder', folderPath, 'Folder already exists');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Create folder
    await fs.mkdir(folderPath);
    const entry = await this.getFileEntry(folderPath);

    logger.info({ path: folderPath }, 'Created folder');
    return { path: folderPath, entry };
  }

  /**
   * Rename a file or folder
   */
  async rename(
    oldPath: string,
    newName: string
  ): Promise<{ oldPath: string; newPath: string; entry: FileEntry }> {
    this.validateName(newName);
    const validatedOldPath = await this.validatePath(oldPath);

    // Cannot rename root paths
    if (this.isRootPath(validatedOldPath)) {
      throw new FileAccessDeniedError(oldPath, 'Cannot rename root directory');
    }

    // Check file exists
    try {
      await fs.access(validatedOldPath);
    } catch {
      throw new FileNotFoundError(oldPath);
    }

    const parentDir = path.dirname(validatedOldPath);
    const newPath = path.join(parentDir, newName);

    // Check new path is within allowed roots
    if (!this.isPathAllowed(newPath)) {
      throw new FileAccessDeniedError(newPath, 'New path is outside allowed directories');
    }

    // Check new name doesn't already exist (unless renaming to same case)
    if (validatedOldPath.toLowerCase() !== newPath.toLowerCase()) {
      try {
        await fs.access(newPath);
        throw new FileOperationError('rename', newPath, 'A file or folder with that name already exists');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    // Rename
    await fs.rename(validatedOldPath, newPath);
    const entry = await this.getFileEntry(newPath);

    logger.info({ oldPath: validatedOldPath, newPath }, 'Renamed file/folder');
    return { oldPath: validatedOldPath, newPath, entry };
  }

  /**
   * Delete files or folders
   */
  async deleteItems(
    paths: string[]
  ): Promise<{ deletedPaths: string[]; failedPaths: Array<{ path: string; error: string }> }> {
    if (paths.length > 100) {
      throw new FileOperationError('delete', '', 'Cannot delete more than 100 items at once');
    }

    const deletedPaths: string[] = [];
    const failedPaths: Array<{ path: string; error: string }> = [];

    for (const itemPath of paths) {
      try {
        const validatedPath = await this.validatePath(itemPath);

        // Cannot delete root paths
        if (this.isRootPath(validatedPath)) {
          failedPaths.push({ path: itemPath, error: 'Cannot delete root directory' });
          continue;
        }

        // Check file exists
        try {
          await fs.access(validatedPath);
        } catch {
          failedPaths.push({ path: itemPath, error: 'File not found' });
          continue;
        }

        // Delete recursively
        await fs.rm(validatedPath, { recursive: true, force: true });
        deletedPaths.push(validatedPath);
        logger.info({ path: validatedPath }, 'Deleted file/folder');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failedPaths.push({ path: itemPath, error: message });
        logger.error({ error, path: itemPath }, 'Failed to delete file/folder');
      }
    }

    return { deletedPaths, failedPaths };
  }

  /**
   * Copy files or folders
   */
  async copyItems(
    sourcePaths: string[],
    destinationPath: string
  ): Promise<{ copiedPaths: Array<{ source: string; destination: string }>; failedPaths: Array<{ path: string; error: string }> }> {
    if (sourcePaths.length > 100) {
      throw new FileOperationError('copy', '', 'Cannot copy more than 100 items at once');
    }

    const validatedDest = await this.validatePath(destinationPath);

    // Check destination is a directory
    const destStat = await fs.stat(validatedDest);
    if (!destStat.isDirectory()) {
      throw new FileOperationError('copy', destinationPath, 'Destination must be a directory');
    }

    const copiedPaths: Array<{ source: string; destination: string }> = [];
    const failedPaths: Array<{ path: string; error: string }> = [];

    for (const sourcePath of sourcePaths) {
      try {
        const validatedSource = await this.validatePath(sourcePath);

        // Check source exists
        try {
          await fs.access(validatedSource);
        } catch {
          failedPaths.push({ path: sourcePath, error: 'File not found' });
          continue;
        }

        const baseName = path.basename(validatedSource);
        let destPath = path.join(validatedDest, baseName);

        // Handle conflicts by appending suffix
        let counter = 1;
        while (true) {
          try {
            await fs.access(destPath);
            // File exists, add suffix
            const ext = path.extname(baseName);
            const nameWithoutExt = baseName.slice(0, baseName.length - ext.length);
            destPath = path.join(validatedDest, `${nameWithoutExt} (${counter})${ext}`);
            counter++;
          } catch {
            // File doesn't exist, we can use this path
            break;
          }
        }

        // Copy
        await fs.cp(validatedSource, destPath, { recursive: true });
        copiedPaths.push({ source: validatedSource, destination: destPath });
        logger.info({ source: validatedSource, destination: destPath }, 'Copied file/folder');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failedPaths.push({ path: sourcePath, error: message });
        logger.error({ error, path: sourcePath }, 'Failed to copy file/folder');
      }
    }

    return { copiedPaths, failedPaths };
  }

  /**
   * Move files or folders
   */
  async moveItems(
    sourcePaths: string[],
    destinationPath: string
  ): Promise<{ movedPaths: Array<{ source: string; destination: string }>; failedPaths: Array<{ path: string; error: string }> }> {
    if (sourcePaths.length > 100) {
      throw new FileOperationError('move', '', 'Cannot move more than 100 items at once');
    }

    const validatedDest = await this.validatePath(destinationPath);

    // Check destination is a directory
    const destStat = await fs.stat(validatedDest);
    if (!destStat.isDirectory()) {
      throw new FileOperationError('move', destinationPath, 'Destination must be a directory');
    }

    const movedPaths: Array<{ source: string; destination: string }> = [];
    const failedPaths: Array<{ path: string; error: string }> = [];

    for (const sourcePath of sourcePaths) {
      try {
        const validatedSource = await this.validatePath(sourcePath);

        // Cannot move root paths
        if (this.isRootPath(validatedSource)) {
          failedPaths.push({ path: sourcePath, error: 'Cannot move root directory' });
          continue;
        }

        // Check source exists
        try {
          await fs.access(validatedSource);
        } catch {
          failedPaths.push({ path: sourcePath, error: 'File not found' });
          continue;
        }

        const baseName = path.basename(validatedSource);
        const destPath = path.join(validatedDest, baseName);

        // Check we're not moving into itself
        if (destPath.startsWith(validatedSource + path.sep)) {
          failedPaths.push({ path: sourcePath, error: 'Cannot move a folder into itself' });
          continue;
        }

        // Check we're not moving to same location
        if (validatedSource === destPath) {
          failedPaths.push({ path: sourcePath, error: 'Source and destination are the same' });
          continue;
        }

        // Check destination path is allowed
        if (!this.isPathAllowed(destPath)) {
          failedPaths.push({ path: sourcePath, error: 'Destination is outside allowed directories' });
          continue;
        }

        // Check if destination already exists
        try {
          await fs.access(destPath);
          failedPaths.push({ path: sourcePath, error: 'A file or folder with that name already exists at destination' });
          continue;
        } catch {
          // File doesn't exist, we can proceed
        }

        // Move
        await fs.rename(validatedSource, destPath);
        movedPaths.push({ source: validatedSource, destination: destPath });
        logger.info({ source: validatedSource, destination: destPath }, 'Moved file/folder');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failedPaths.push({ path: sourcePath, error: message });
        logger.error({ error, path: sourcePath }, 'Failed to move file/folder');
      }
    }

    return { movedPaths, failedPaths };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Close all watchers
    for (const [dirPath, watcher] of this.watchers) {
      watcher.close();
      logger.debug({ path: dirPath }, 'Closed watcher');
    }
    this.watchers.clear();

    this.removeAllListeners();
    logger.info('File manager destroyed');
  }
}
