/**
 * Canvas Component
 *
 * Main React Flow canvas for the dashboard.
 * Handles node rendering, drag-and-drop, and pan/zoom.
 */

'use client';

import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  type OnConnect,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@/stores/canvas-store';
import { nodeTypes } from '@/components/nodes';
import { NodePalette } from '@/components/palette/NodePalette';
import { CanvasControls } from './CanvasControls';
import { NodeType } from '@masterdashboard/shared';

export function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    setSelectedNode,
    setViewport,
  } = useCanvasStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // Store screen-to-flow function separately to avoid generic type issues
  const screenToFlowRef = useRef<((position: { x: number; y: number }) => { x: number; y: number }) | null>(null);

  // Handle new connections between nodes
  const onConnect: OnConnect = useCallback(
    (params) => {
      addEdge(params);
    },
    [addEdge]
  );

  // Handle drag over for node palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from node palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !Object.values(NodeType).includes(type)) return;

      // Get the position relative to the canvas
      if (reactFlowWrapper.current && screenToFlowRef.current) {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = screenToFlowRef.current({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });

        addNode(type, position);
      }
    },
    [addNode]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Handle React Flow initialization
  const onInit = useCallback((instance: { screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number } }) => {
    screenToFlowRef.current = instance.screenToFlowPosition;
  }, []);

  // Handle viewport change
  const onMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Custom minimap node colors
  const nodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case NodeType.TERMINAL:
        return '#22c55e'; // Green
      case NodeType.BROWSER:
        return '#3b82f6'; // Blue
      case NodeType.SSH:
        return '#f59e0b'; // Amber
      default:
        return '#6b7280'; // Gray
    }
  }, []);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#334155"
        />
        <Controls
          className="bg-slate-800 border-slate-700 rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="bg-slate-800 border-slate-700 rounded-lg"
          pannable
          zoomable
        />
        <Panel position="top-left" className="m-4">
          <NodePalette />
        </Panel>
        <Panel position="top-right" className="m-4">
          <CanvasControls />
        </Panel>
      </ReactFlow>
    </div>
  );
}
