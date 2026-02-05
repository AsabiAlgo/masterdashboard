/**
 * Canvas Hook
 *
 * Custom hook for canvas operations including viewport management,
 * layout operations, and node utilities.
 */

import { useCallback } from 'react';
import { useReactFlow, type ReactFlowInstance } from '@xyflow/react';
import {
  useCanvasStore,
  useNodes,
  useEdges,
  useSelectedNodeId,
} from '@/stores/canvas-store';
import {
  NodeType,
  type DashboardNode,
  DEFAULT_NODE_DIMENSIONS,
  type LayoutPresetConfig,
} from '@masterdashboard/shared';

interface UseCanvasReturn {
  /** All nodes on the canvas */
  nodes: DashboardNode[];
  /** All edges on the canvas */
  edges: ReturnType<typeof useEdges>;
  /** Currently selected node ID */
  selectedNodeId: string | null;
  /** Add a node at center of viewport */
  addNodeAtCenter: (type: NodeType) => string;
  /** Add a node at specific position */
  addNode: (type: NodeType, position: { x: number; y: number }) => string;
  /** Remove a node */
  removeNode: (nodeId: string) => void;
  /** Select a node */
  selectNode: (nodeId: string | null) => void;
  /** Clear the entire canvas */
  clearCanvas: () => void;
  /** Fit view to all nodes */
  fitView: () => void;
  /** Center on a specific node */
  centerOnNode: (nodeId: string) => void;
  /** Arrange nodes in a grid */
  arrangeNodes: (config?: Partial<LayoutPresetConfig>) => void;
  /** Get node count by type */
  getNodeCount: (type?: NodeType) => number;
}

export function useCanvas(): UseCanvasReturn {
  const nodes = useNodes();
  const edges = useEdges();
  const selectedNodeId = useSelectedNodeId();
  const { addNode, removeNode, setSelectedNode, clearCanvas } =
    useCanvasStore();

  // ReactFlow instance for viewport operations
  let reactFlowInstance: ReactFlowInstance | null = null;
  try {
    // This will throw if not inside ReactFlowProvider
    reactFlowInstance = useReactFlow();
  } catch {
    // Not inside ReactFlowProvider, operations requiring it will be no-ops
  }

  // Add a node at the center of the current viewport
  const addNodeAtCenter = useCallback(
    (type: NodeType): string => {
      let position = { x: 100, y: 100 };

      if (reactFlowInstance) {
        const viewport = reactFlowInstance.getViewport();
        const dimensions = DEFAULT_NODE_DIMENSIONS[type];

        // Get the center of the current viewport
        const centerX =
          -viewport.x / viewport.zoom +
          (typeof window !== 'undefined' ? window.innerWidth : 1200) /
            2 /
            viewport.zoom;
        const centerY =
          -viewport.y / viewport.zoom +
          (typeof window !== 'undefined' ? window.innerHeight : 800) /
            2 /
            viewport.zoom;

        position = {
          x: centerX - dimensions.width / 2,
          y: centerY - dimensions.height / 2,
        };
      }

      return addNode(type, position);
    },
    [addNode, reactFlowInstance]
  );

  // Select a node
  const selectNode = useCallback(
    (nodeId: string | null) => {
      setSelectedNode(nodeId);
    },
    [setSelectedNode]
  );

  // Fit view to all nodes
  const fitView = useCallback(() => {
    if (reactFlowInstance && nodes.length > 0) {
      reactFlowInstance.fitView({
        padding: 0.2,
        duration: 300,
      });
    }
  }, [reactFlowInstance, nodes.length]);

  // Center on a specific node
  const centerOnNode = useCallback(
    (nodeId: string) => {
      if (reactFlowInstance) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          reactFlowInstance.setCenter(
            node.position.x + (node.width ?? 300) / 2,
            node.position.y + (node.height ?? 200) / 2,
            { duration: 300, zoom: 1 }
          );
        }
      }
    },
    [reactFlowInstance, nodes]
  );

  // Arrange nodes in a grid
  const arrangeNodes = useCallback(
    (config: Partial<LayoutPresetConfig> = {}) => {
      const { gap = 40, maxPerRow = 3, startPosition = { x: 50, y: 50 } } = config;

      if (nodes.length === 0) return;

      // Calculate cumulative row heights for variable-height nodes
      const rowHeights: number[] = [];

      // First pass: determine max height for each row
      nodes.forEach((node, index) => {
        const row = Math.floor(index / maxPerRow);
        const defaultDims = DEFAULT_NODE_DIMENSIONS[node.type as NodeType] ?? { width: 400, height: 300 };
        // Use actual measured dimensions, then style, then defaults
        const height = node.measured?.height ?? node.height ?? (node.style?.height as number) ?? defaultDims.height;

        if (rowHeights[row] === undefined || height > rowHeights[row]) {
          rowHeights[row] = height;
        }
      });

      // Second pass: position nodes using actual dimensions
      const updatedNodes = nodes.map((node, index) => {
        const defaultDims = DEFAULT_NODE_DIMENSIONS[node.type as NodeType] ?? { width: 400, height: 300 };
        const row = Math.floor(index / maxPerRow);
        const col = index % maxPerRow;

        // Get actual node dimensions
        const width = node.measured?.width ?? node.width ?? (node.style?.width as number) ?? defaultDims.width;

        // Calculate Y position based on cumulative row heights
        let yPos = startPosition.y;
        for (let r = 0; r < row; r++) {
          yPos += (rowHeights[r] ?? 300) + gap;
        }

        return {
          ...node,
          position: {
            x: startPosition.x + col * (width + gap),
            y: yPos,
          },
        };
      });

      useCanvasStore.getState().loadLayout({
        nodes: updatedNodes,
        edges,
      });

      // Fit view after arrangement
      setTimeout(() => {
        fitView();
      }, 100);
    },
    [nodes, edges, fitView]
  );

  // Get node count by type
  const getNodeCount = useCallback(
    (type?: NodeType): number => {
      if (!type) return nodes.length;
      return nodes.filter((n) => n.type === type).length;
    },
    [nodes]
  );

  return {
    nodes,
    edges,
    selectedNodeId,
    addNodeAtCenter,
    addNode,
    removeNode,
    selectNode,
    clearCanvas,
    fitView,
    centerOnNode,
    arrangeNodes,
    getNodeCount,
  };
}
