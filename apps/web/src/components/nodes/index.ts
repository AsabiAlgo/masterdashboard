/**
 * Node Components Exports
 *
 * Registry of all node types for React Flow.
 */

import type { NodeTypes } from '@xyflow/react';
import { NodeType } from '@masterdashboard/shared';
import { TerminalNode } from './TerminalNode';
import { BrowserNode } from './BrowserNode/BrowserNode';
import { SSHNode } from './SSHNode/SSHNode';
import { NotesNode } from './NotesNode';
import { FolderNode } from './FolderNode';
import { ViewerNode } from './ViewerNode';
import { DiffNode } from './DiffNode';
import { DatabaseNode } from './DatabaseNode';
import { GitNode } from './GitNode';

/**
 * Node type registry for React Flow
 * Using 'as NodeTypes' to allow our custom node data types
 */
export const nodeTypes = {
  [NodeType.TERMINAL]: TerminalNode,
  [NodeType.BROWSER]: BrowserNode,
  [NodeType.SSH]: SSHNode,
  [NodeType.NOTES]: NotesNode,
  [NodeType.FOLDER]: FolderNode,
  [NodeType.VIEWER]: ViewerNode,
  [NodeType.DIFF]: DiffNode,
  [NodeType.DATABASE]: DatabaseNode,
  [NodeType.GIT]: GitNode,
} as NodeTypes;

// Export individual components
export { BaseNode } from './BaseNode';
export { NodeHandle } from './NodeHandle';
export { TerminalNode } from './TerminalNode';
export { BrowserNode } from './BrowserNode/BrowserNode';
export { SSHNode } from './SSHNode/SSHNode';
export { NotesNode } from './NotesNode';
export { FolderNode } from './FolderNode';
export { ViewerNode } from './ViewerNode';
export { DiffNode } from './DiffNode';
export { DatabaseNode } from './DatabaseNode';
export { GitNode } from './GitNode';
