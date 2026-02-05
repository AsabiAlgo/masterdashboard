/**
 * Canvas Store
 *
 * Zustand store for managing React Flow canvas state including
 * nodes, edges, and viewport. Supports per-project layouts.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as addEdgeUtil,
} from '@xyflow/react';
import {
  NodeType,
  type DashboardNode,
  type DashboardEdge,
  type DashboardNodeData,
  type TerminalNodeData,
  type BrowserNodeData,
  type SSHNodeData,
  type NotesNodeData,
  type FolderViewerNodeData,
  type ViewerNodeData,
  type DiffNodeData,
  type DatabaseNodeData,
  type GitNodeData,
  type CanvasViewport,
  DEFAULT_NODE_DIMENSIONS,
  DEFAULT_VIEWPORT,
  ShellType,
  TerminalActivityStatus,
  BrowserEngine,
  DatabaseEngine,
  DatabaseConnectionStatus,
} from '@masterdashboard/shared';
import { useProjectStore } from './project-store';

function generateId(): string {
  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number },
  gap: number = 20
): boolean {
  return !(
    r1.x + r1.width + gap <= r2.x ||
    r2.x + r2.width + gap <= r1.x ||
    r1.y + r1.height + gap <= r2.y ||
    r2.y + r2.height + gap <= r1.y
  );
}

/**
 * Find a non-overlapping position for a new node
 * Tries positions in this order: original, below, right, above, left
 * Falls back to diagonal offset if all directions are blocked
 */
function findNonOverlappingPosition(
  nodes: DashboardNode[],
  startPos: { x: number; y: number },
  dimensions: { width: number; height: number },
  gap: number = 30
): { x: number; y: number } {
  // Helper to check if a position overlaps with any existing node
  const checkOverlap = (pos: { x: number; y: number }): boolean => {
    return nodes.some((node) => {
      const nodeWidth = (node.style?.width as number) ?? node.measured?.width ?? 400;
      const nodeHeight = (node.style?.height as number) ?? node.measured?.height ?? 300;
      return rectsOverlap(
        { ...pos, ...dimensions },
        { x: node.position.x, y: node.position.y, width: nodeWidth, height: nodeHeight },
        gap
      );
    });
  };

  // Check if start position is free
  if (!checkOverlap(startPos)) {
    return startPos;
  }

  // Collect all candidate positions from multiple directions
  type Candidate = { pos: { x: number; y: number }; distance: number };
  const candidates: Candidate[] = [];

  for (const node of nodes) {
    const nodeWidth = (node.style?.width as number) ?? node.measured?.width ?? 400;
    const nodeHeight = (node.style?.height as number) ?? node.measured?.height ?? 300;

    // Try 4 directions: right, below, left, above
    const positions = [
      { x: node.position.x + nodeWidth + gap, y: node.position.y }, // Right
      { x: node.position.x, y: node.position.y + nodeHeight + gap }, // Below
      { x: node.position.x - dimensions.width - gap, y: node.position.y }, // Left
      { x: node.position.x, y: node.position.y - dimensions.height - gap }, // Above
    ];

    for (const pos of positions) {
      if (!checkOverlap(pos)) {
        // Calculate distance from start position to prefer closer placements
        const distance = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
        );
        candidates.push({ pos, distance });
      }
    }
  }

  // Return the closest non-overlapping position
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.distance - b.distance);
    const closest = candidates[0];
    if (closest) {
      return closest.pos;
    }
  }

  // Fallback: diagonal offset from start position
  // Keep trying with increasing offsets until we find a free spot
  for (let offset = 1; offset <= 10; offset++) {
    const diagonalPos = {
      x: startPos.x + offset * (dimensions.width + gap),
      y: startPos.y + offset * 50,
    };
    if (!checkOverlap(diagonalPos)) {
      return diagonalPos;
    }
  }

  // Ultimate fallback: just offset from start
  return {
    x: startPos.x + dimensions.width + gap,
    y: startPos.y,
  };
}

interface ProjectLayout {
  nodes: DashboardNode[];
  edges: DashboardEdge[];
  viewport: CanvasViewport;
}

interface CanvasState {
  // State
  projectId: string | null;
  nodes: DashboardNode[];
  edges: DashboardEdge[];
  viewport: CanvasViewport;
  selectedNodeId: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';

  // Per-project layouts storage
  projectLayouts: Record<string, ProjectLayout>;

  // Project actions
  setProjectId: (projectId: string | null) => void;

  // Node change handlers
  onNodesChange: OnNodesChange<DashboardNode>;
  onEdgesChange: OnEdgesChange<DashboardEdge>;

  // Node actions
  addNode: (type: NodeType, position: { x: number; y: number }) => string;
  addNodeAtViewportCenter: (type: NodeType) => string;
  removeNode: (nodeId: string) => void;
  updateNodeData: <T extends DashboardNodeData>(
    nodeId: string,
    data: Partial<T>
  ) => void;
  setNodeConnected: (nodeId: string, connected: boolean) => void;
  setNodeSessionId: (nodeId: string, sessionId: string) => void;

  // Edge actions
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;

  // Selection actions
  setSelectedNode: (nodeId: string | null) => void;

  // Viewport actions
  setViewport: (viewport: CanvasViewport) => void;

  // Connection status
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;

  // Canvas actions
  clearCanvas: () => void;
  saveLayout: () => { nodes: DashboardNode[]; edges: DashboardEdge[]; viewport: CanvasViewport };
  loadLayout: (layout: {
    nodes: DashboardNode[];
    edges: DashboardEdge[];
    viewport?: CanvasViewport;
  }) => void;

  // Utility
  getNode: (nodeId: string) => DashboardNode | undefined;
  getNodesByType: (type: NodeType) => DashboardNode[];
}

function createDefaultNodeData(
  type: NodeType,
  nodeCount: number,
  projectId: string | null,
  defaultCwd: string = '~'
): DashboardNodeData {
  const baseData = {
    sessionId: '',
    label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodeCount + 1}`,
    projectId: projectId || 'default',
  };

  switch (type) {
    case NodeType.TERMINAL:
      return {
        ...baseData,
        shell: ShellType.BASH,
        connected: false,
        activityStatus: TerminalActivityStatus.IDLE,
        cwd: defaultCwd,
      } as TerminalNodeData;

    case NodeType.BROWSER:
      return {
        ...baseData,
        url: 'about:blank',
        engine: BrowserEngine.CHROMIUM,
        connected: false,
      } as BrowserNodeData;

    case NodeType.SSH:
      return {
        ...baseData,
        host: '',
        port: 22,
        username: '',
        connected: false,
        activityStatus: TerminalActivityStatus.IDLE,
      } as SSHNodeData;

    case NodeType.NOTES:
      return {
        ...baseData,
        content: '',
        color: 'yellow',
        mode: 'edit',
      } as NotesNodeData;

    case NodeType.FOLDER:
      return {
        ...baseData,
        rootPath: defaultCwd,
        currentPath: defaultCwd,
        connected: false,
        expandedPaths: [],
        selectedPaths: [],
        focusedPath: null,
        viewMode: 'list',
        showHidden: false,
        sortBy: 'name',
        sortDirection: 'asc',
        searchQuery: '',
      } as FolderViewerNodeData;

    case NodeType.VIEWER:
      return {
        ...baseData,
        filePath: '',
        fileName: '',
        content: '',
        contentType: 'text',
        extension: '',
        loading: false,
        error: null,
        wordWrap: false,
        showLineNumbers: true,
        editMode: false,
        isDirty: false,
        editContent: null,
        showMinimap: true,
        fontSize: 14,
      } as ViewerNodeData;

    case NodeType.DIFF:
      return {
        ...baseData,
        leftFilePath: '',
        leftFileName: '',
        leftContent: '',
        rightFilePath: '',
        rightFileName: '',
        rightContent: '',
        viewMode: 'split',
        showLineNumbers: true,
        collapseUnchanged: false,
        contextLines: 3,
        loading: false,
        error: null,
      } as DiffNodeData;

    case NodeType.DATABASE:
      return {
        ...baseData,
        engine: DatabaseEngine.POSTGRESQL,
        connectionName: '',
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        connected: false,
        connectionStatus: DatabaseConnectionStatus.DISCONNECTED,
        query: '',
        results: null,
        schema: null,
        queryHistory: [],
        showSchema: true,
        loading: false,
        error: null,
      } as DatabaseNodeData;

    case NodeType.GIT:
      return {
        ...baseData,
        repoPath: defaultCwd,
        connected: false,
        viewMode: 'status',
        selectedFiles: [],
        commitLimit: 50,
        loading: false,
        error: null,
      } as GitNodeData;

    default:
      return baseData as DashboardNodeData;
  }
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projectId: null,
        nodes: [],
        edges: [],
        viewport: { ...DEFAULT_VIEWPORT },
        selectedNodeId: null,
        connectionStatus: 'disconnected',
        projectLayouts: {},

        // Project actions
        setProjectId: (projectId) => {
          const state = get();

          // Save current layout for current project before switching
          if (state.projectId && state.nodes.length > 0) {
            set({
              projectLayouts: {
                ...state.projectLayouts,
                [state.projectId]: {
                  nodes: state.nodes,
                  edges: state.edges,
                  viewport: state.viewport,
                },
              },
            });
          }

          // Load layout for new project
          const layout = projectId ? state.projectLayouts[projectId] : null;

          // Detect and clear duplicate sessionIds to prevent multiple nodes
          // from reconnecting to the same session (caused by old bugs)
          const seenSessionIds = new Set<string>();
          const sanitizedNodes = (layout?.nodes ?? []).map((node) => {
            const sessionId = node.data?.sessionId;
            if (sessionId && seenSessionIds.has(sessionId)) {
              // Duplicate found - clear it to force new session creation
              return {
                ...node,
                data: {
                  ...node.data,
                  sessionId: '',
                  connected: false,
                },
              };
            }
            if (sessionId) {
              seenSessionIds.add(sessionId);
            }
            return {
              ...node,
              data: {
                ...node.data,
                connected: false, // Always reset connected state on load
              },
            };
          });

          set({
            projectId,
            nodes: sanitizedNodes,
            edges: layout?.edges ?? [],
            viewport: layout?.viewport ?? { ...DEFAULT_VIEWPORT },
            selectedNodeId: null,
          });
        },

        // Node change handlers
        onNodesChange: (changes) => {
          set({
            nodes: applyNodeChanges(changes, get().nodes) as DashboardNode[],
          });
        },

        onEdgesChange: (changes) => {
          set({
            edges: applyEdgeChanges(changes, get().edges) as DashboardEdge[],
          });
        },

        // Node actions
        addNode: (type, position) => {
          const state = get();
          const nodeId = generateId();
          const dimensions = DEFAULT_NODE_DIMENSIONS[type];
          const existingNodes = state.nodes.filter((n) => n.type === type);

          // Get project's defaultCwd from project store for consistency
          const projectState = useProjectStore.getState();
          const defaultCwd = projectState.currentProject?.defaultCwd || '~';

          // Find a non-overlapping position
          const finalPosition = findNonOverlappingPosition(
            state.nodes,
            position,
            dimensions
          );

          const newNode: DashboardNode = {
            id: nodeId,
            type,
            position: finalPosition,
            data: createDefaultNodeData(type, existingNodes.length, state.projectId, defaultCwd),
            style: {
              width: dimensions.width,
              height: dimensions.height,
            },
          };

          set({
            nodes: [...state.nodes, newNode],
            selectedNodeId: nodeId,
          });

          return nodeId;
        },

        addNodeAtViewportCenter: (type) => {
          const state = get();
          const dimensions = DEFAULT_NODE_DIMENSIONS[type];
          const { viewport } = state;

          // Calculate the center of the current viewport
          // Viewport stores the pan offset (negative when panned right/down)
          // and zoom level
          const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

          // Convert screen center to flow coordinates
          const centerX = -viewport.x / viewport.zoom + windowWidth / 2 / viewport.zoom;
          const centerY = -viewport.y / viewport.zoom + windowHeight / 2 / viewport.zoom;

          // Offset to center the node (not just position its top-left corner)
          const position = {
            x: centerX - dimensions.width / 2,
            y: centerY - dimensions.height / 2,
          };

          // Use addNode which handles overlap detection
          return state.addNode(type, position);
        },

        removeNode: (nodeId) => {
          const state = get();
          set({
            nodes: state.nodes.filter((n) => n.id !== nodeId),
            edges: state.edges.filter(
              (e) => e.source !== nodeId && e.target !== nodeId
            ),
            selectedNodeId:
              state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          });
        },

        updateNodeData: (nodeId, data) => {
          set({
            nodes: get().nodes.map((node) => {
              if (node.id !== nodeId) return node;

              const newData = { ...node.data, ...data };

              // Handle locked state for notes - prevent dragging when locked
              const lockData = data as { locked?: boolean };
              if ('locked' in lockData && node.type === NodeType.NOTES) {
                return {
                  ...node,
                  data: newData,
                  draggable: !lockData.locked,
                };
              }

              return { ...node, data: newData };
            }),
          });
        },

        setNodeConnected: (nodeId, connected) => {
          set({
            nodes: get().nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, connected } }
                : node
            ),
          });
        },

        setNodeSessionId: (nodeId, sessionId) => {
          set({
            nodes: get().nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, sessionId } }
                : node
            ),
          });
        },

        // Edge actions
        addEdge: (connection) => {
          set({
            edges: addEdgeUtil(connection, get().edges),
          });
        },

        removeEdge: (edgeId) => {
          set({
            edges: get().edges.filter((e) => e.id !== edgeId),
          });
        },

        // Selection actions
        setSelectedNode: (nodeId) => {
          const currentNodes = get().nodes;
          // Only update nodes if selection actually changed
          if (get().selectedNodeId === nodeId) return;

          const updatedNodes = currentNodes.map((node) => ({
            ...node,
            selected: node.id === nodeId,
          }));
          set({
            selectedNodeId: nodeId,
            nodes: updatedNodes,
          });
        },

        // Viewport actions
        setViewport: (viewport) => {
          set({ viewport });
        },

        // Connection status
        setConnectionStatus: (status) => {
          set({ connectionStatus: status });
        },

        // Canvas actions
        clearCanvas: () => {
          const state = get();
          // Clear current nodes and also clear from projectLayouts so they don't come back on refresh
          const updatedProjectLayouts = { ...state.projectLayouts };
          if (state.projectId) {
            delete updatedProjectLayouts[state.projectId];
          }
          set({
            nodes: [],
            edges: [],
            selectedNodeId: null,
            projectLayouts: updatedProjectLayouts,
          });
        },

        saveLayout: () => {
          const state = get();
          return {
            nodes: state.nodes,
            edges: state.edges,
            viewport: state.viewport,
          };
        },

        loadLayout: (layout) => {
          set({
            nodes: layout.nodes,
            edges: layout.edges,
            viewport: layout.viewport ?? { ...DEFAULT_VIEWPORT },
          });
        },

        // Utility
        getNode: (nodeId) => {
          return get().nodes.find((n) => n.id === nodeId);
        },

        getNodesByType: (type) => {
          return get().nodes.filter((n) => n.type === type);
        },
      }),
      {
        name: 'masterdashboard-canvas',
        partialize: (state) => ({
          projectId: state.projectId,
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          projectLayouts: state.projectLayouts,
        }),
        // Sanitize data during hydration merge to handle corrupted/duplicate sessionIds
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<CanvasState> | undefined;
          if (!persisted) return currentState;

          // Helper to sanitize nodes - detect/clear duplicate sessionIds and reset connected state
          const sanitizeNodes = (nodes: DashboardNode[]): DashboardNode[] => {
            const seenSessionIds = new Set<string>();
            return nodes.map((node) => {
              const sessionId = node.data?.sessionId;
              if (sessionId && seenSessionIds.has(sessionId)) {
                // Duplicate found - clear it to force new session creation
                return {
                  ...node,
                  data: { ...node.data, sessionId: '', connected: false },
                };
              }
              if (sessionId) {
                seenSessionIds.add(sessionId);
              }
              return {
                ...node,
                data: { ...node.data, connected: false },
              };
            });
          };

          // Sanitize current nodes
          const sanitizedNodes = persisted.nodes ? sanitizeNodes(persisted.nodes) : [];

          // Sanitize all project layouts
          const sanitizedLayouts: Record<string, ProjectLayout> = {};
          if (persisted.projectLayouts) {
            for (const projectId in persisted.projectLayouts) {
              const layout = persisted.projectLayouts[projectId];
              if (layout?.nodes) {
                sanitizedLayouts[projectId] = {
                  ...layout,
                  nodes: sanitizeNodes(layout.nodes),
                };
              }
            }
          }

          return {
            ...currentState,
            ...persisted,
            nodes: sanitizedNodes,
            projectLayouts: sanitizedLayouts,
          };
        },
      }
    ),
    { name: 'CanvasStore' }
  )
);

// Selector hooks for optimized renders
export const useProjectId = () => useCanvasStore((state) => state.projectId);
export const useNodes = () => useCanvasStore((state) => state.nodes);
export const useEdges = () => useCanvasStore((state) => state.edges);
export const useSelectedNodeId = () =>
  useCanvasStore((state) => state.selectedNodeId);
export const useConnectionStatus = () =>
  useCanvasStore((state) => state.connectionStatus);
export const useSelectedNode = () =>
  useCanvasStore((state) =>
    state.selectedNodeId
      ? state.nodes.find((n) => n.id === state.selectedNodeId)
      : null
  );
