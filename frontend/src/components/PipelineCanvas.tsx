import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Node,
  BackgroundVariant,
  ConnectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SourceNode from './nodes/SourceNode';
import TransformNode from './nodes/TransformNode';
import FilterNode from './nodes/FilterNode';
import SinkNode from './nodes/SinkNode';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { NodeTypeDefinition } from '@/types';

const nodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  filter: FilterNode,
  sink: SinkNode,
};

let nodeIdCounter = 0;
const getNextId = () => `node_${++nodeIdCounter}_${Date.now()}`;

interface PipelineCanvasProps {
  onNodeDoubleClick: (node: Node) => void;
}

export default function PipelineCanvas({ onNodeDoubleClick }: PipelineCanvasProps) {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const setNodes = usePipelineStore((s) => s.setNodes);
  const setEdges = usePipelineStore((s) => s.setEdges);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const pushHistory = usePipelineStore((s) => s.pushHistory);
  const undo = usePipelineStore((s) => s.undo);
  const redo = usePipelineStore((s) => s.redo);
  const canUndo = usePipelineStore((s) => s.canUndo);
  const canRedo = usePipelineStore((s) => s.canRedo);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.metaKey || e.ctrlKey) && e.key === 'y') ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(
        addEdge(
          {
            ...connection,
            id: `edge_${Date.now()}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          edges
        )
      );
      setTimeout(pushHistory, 0);
    },
    [edges, setEdges, pushHistory]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const dataStr = event.dataTransfer.getData('application/reactflow');
      if (!dataStr) return;

      const nodeTypeDef: NodeTypeDefinition = JSON.parse(dataStr);

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNextId(),
        type: nodeTypeDef.type,
        position,
        data: { ...nodeTypeDef.defaultData },
      };

      setNodes([...nodes, newNode]);
      setTimeout(pushHistory, 0);
    },
    [nodes, setNodes, pushHistory, screenToFlowPosition]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdges(
        edges.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
      );
      setTimeout(pushHistory, 0);
    },
    [edges, setEdges, pushHistory]
  );

  const onEdgesDelete = useCallback(
    () => {
      setTimeout(pushHistory, 0);
    },
    [pushHistory]
  );

  const onNodeDragStop = useCallback(
    () => {
      setTimeout(pushHistory, 0);
    },
    [pushHistory]
  );

  const defaultEdgeOptions = {
    type: 'smoothstep' as const,
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
  };

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDoubleClick={(_, node) => onNodeDoubleClick(node)}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode="Delete"
        className="bg-gray-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls
          className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700"
        />
        <MiniMap
          className="!bg-gray-900 !border-gray-700 !rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'source': return '#059669';
              case 'transform': return '#2563eb';
              case 'filter': return '#7c3aed';
              case 'sink': return '#ea580c';
              default: return '#6366f1';
            }
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-1.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          title="撤销 (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          撤销
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          title="重做 (Ctrl+Y 或 Ctrl+Shift+Z)"
        >
          重做
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded">
        双击节点编辑配置 • Ctrl+Z 撤销 • Ctrl+Y 重做 • Delete 删除节点
      </div>
    </div>
  );
}
