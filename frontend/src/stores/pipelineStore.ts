import { create } from 'zustand';
import type { PipelineNode, PipelineEdge, PipelineData, PipelineSummary } from '@/types';
import api from '@/api/client';
import type { Node, Edge } from '@xyflow/react';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface PipelineState {
  pipelines: PipelineSummary[];
  currentPipeline: PipelineData | null;
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  history: HistoryState[];
  historyIndex: number;

  fetchPipelines: () => Promise<void>;
  fetchPipeline: (id: string) => Promise<void>;
  savePipeline: (name: string, description?: string) => Promise<void>;
  updatePipeline: (id: string, name: string, description?: string) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  setCurrentPipeline: (pipeline: PipelineData | null) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearCanvas: () => void;
  clearError: () => void;
}

const applyNodeChanges = (changes: any, nodes: Node[]): Node[] => {
  let updated = [...nodes];
  for (const change of changes) {
    if (change.type === 'position' && change.position) {
      updated = updated.map((n) =>
        n.id === change.id ? { ...n, position: change.position! } : n
      );
    } else if (change.type === 'remove') {
      updated = updated.filter((n) => n.id !== change.id);
    } else if (change.type === 'select') {
      updated = updated.map((n) =>
        n.id === change.id ? { ...n, selected: change.selected } : n
      );
    }
  }
  return updated;
};

const applyEdgeChanges = (changes: any, edges: Edge[]): Edge[] => {
  let updated = [...edges];
  for (const change of changes) {
    if (change.type === 'remove') {
      updated = updated.filter((e) => e.id !== change.id);
    } else if (change.type === 'select') {
      updated = updated.map((e) =>
        e.id === change.id ? { ...e, selected: change.selected } : e
      );
    }
  }
  return updated;
};

const nodesToApi = (nodes: Node[]): PipelineNode[] =>
  nodes.map((n) => ({
    id: n.id,
    type: n.type || 'transform',
    position: n.position,
    data: n.data as Record<string, unknown>,
  }));

const edgesToApi = (edges: Edge[]): PipelineEdge[] =>
  edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  }));

const apiToNodes = (nodes: PipelineNode[]): Node[] =>
  nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

const apiToEdges = (edges: PipelineEdge[]): Edge[] =>
  edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: [],
  currentPipeline: null,
  nodes: [],
  edges: [],
  isLoading: false,
  isSaving: false,
  error: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  fetchPipelines: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<PipelineSummary[]>('/pipelines');
      set({ pipelines: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || '获取流水线列表失败', isLoading: false });
    }
  },

  fetchPipeline: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<PipelineData>(`/pipelines/${id}`);
      set({
        currentPipeline: data,
        nodes: apiToNodes(data.nodes),
        edges: apiToEdges(data.edges),
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || '获取流水线数据失败', isLoading: false });
    }
  },

  savePipeline: async (name, description) => {
    set({ isSaving: true, error: null });
    try {
      const { nodes, edges } = get();
      const { data } = await api.post<PipelineData>('/pipelines', {
        name,
        description,
        nodes: nodesToApi(nodes),
        edges: edgesToApi(edges),
      });
      set({ currentPipeline: data, isSaving: false });
      get().fetchPipelines();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '保存流水线失败', isSaving: false });
    }
  },

  updatePipeline: async (id, name, description) => {
    set({ isSaving: true, error: null });
    try {
      const { nodes, edges } = get();
      const { data } = await api.put<PipelineData>(`/pipelines/${id}`, {
        name,
        description,
        nodes: nodesToApi(nodes),
        edges: edgesToApi(edges),
      });
      set({ currentPipeline: data, isSaving: false });
      get().fetchPipelines();
    } catch (err: any) {
      set({ error: err.response?.data?.message || '更新流水线失败', isSaving: false });
    }
  },

  deletePipeline: async (id) => {
    try {
      await api.delete(`/pipelines/${id}`);
      set((state) => ({
        pipelines: state.pipelines.filter((p) => p.id !== id),
        currentPipeline: state.currentPipeline?.id === id ? null : state.currentPipeline,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || '删除流水线失败' });
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },

  setCurrentPipeline: (pipeline) => {
    if (pipeline) {
      set({
        currentPipeline: pipeline,
        nodes: apiToNodes(pipeline.nodes),
        edges: apiToEdges(pipeline.edges),
        history: [],
        historyIndex: -1,
        canUndo: false,
        canRedo: false,
      });
    } else {
      set({
        currentPipeline: null,
        nodes: [],
        edges: [],
        history: [],
        historyIndex: -1,
        canUndo: false,
        canRedo: false,
      });
    }
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      set({
        nodes: [...state.nodes],
        edges: [...state.edges],
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      set({
        nodes: [...state.nodes],
        edges: [...state.edges],
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < history.length - 1,
      });
    }
  },

  clearCanvas: () => set({
    nodes: [],
    edges: [],
    currentPipeline: null,
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
  }),

  clearError: () => set({ error: null }),
}));
