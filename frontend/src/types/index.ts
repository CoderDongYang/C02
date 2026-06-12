export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PipelineSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineData {
  id: string;
  name: string;
  description: string | null;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface CreatePipelineRequest {
  name: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export type NodeTypeCategory = 'source' | 'transform' | 'sink' | 'filter';

export interface NodeTypeDefinition {
  type: NodeTypeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Record<string, unknown>;
}
