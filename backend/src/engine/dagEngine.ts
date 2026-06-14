import { createClient } from 'redis';
import type { PrismaClient } from '@prisma/client';

export interface DAGNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
}

export interface ExecutionResult {
  nodeId: string;
  output: unknown;
  error?: string;
}

const MAX_RETRIES = 3;
const REDIS_KEY_PREFIX = 'flowforge:output:';
const REDIS_KEY_TTL = 3600;

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient?.isOpen) return redisClient;
  redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  await redisClient.connect();
  return redisClient;
}

export function topologicalSort(nodes: DAGNode[], edges: DAGEdge[]): DAGNode[][] {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adj.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const levels: DAGNode[][] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let current: string[] = [];

  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) current.push(nodeId);
  }

  while (current.length > 0) {
    const levelNodes = current.map((id) => nodeMap.get(id)!).filter(Boolean);
    levels.push(levelNodes);

    const next: string[] = [];
    for (const nodeId of current) {
      for (const neighbor of adj.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) next.push(neighbor);
      }
    }
    current = next;
  }

  const visitedCount = levels.reduce((sum, level) => sum + level.length, 0);
  if (visitedCount !== nodes.length) {
    throw new Error('Cycle detected in pipeline DAG');
  }

  return levels;
}

async function storeOutput(runId: string, nodeId: string, output: unknown): Promise<void> {
  const redis = await getRedisClient();
  const key = `${REDIS_KEY_PREFIX}${runId}:${nodeId}`;
  await redis.set(key, JSON.stringify(output), { EX: REDIS_KEY_TTL });
}

async function getUpstreamOutputs(runId: string, upstreamNodeIds: string[]): Promise<Record<string, unknown>> {
  if (upstreamNodeIds.length === 0) return {};
  const redis = await getRedisClient();
  const results: Record<string, unknown> = {};

  for (const nodeId of upstreamNodeIds) {
    const key = `${REDIS_KEY_PREFIX}${runId}:${nodeId}`;
    const raw = await redis.get(key);
    if (raw) {
      results[nodeId] = JSON.parse(raw);
    }
  }

  return results;
}

async function executeWithRetry(
  fn: () => Promise<unknown>,
  nodeId: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ output: unknown; retryCount: number; error?: string }> {
  let lastError: Error | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const output = await fn();
      return { output, retryCount };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      retryCount = attempt;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return { output: null, retryCount, error: lastError?.message };
}

export async function executePipeline(
  prisma: PrismaClient,
  pipelineId: string,
  trigger: 'manual' | 'schedule',
  io?: any
): Promise<string> {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
  });

  if (!pipeline) throw new Error('Pipeline not found');

  const nodes = pipeline.nodes as unknown as DAGNode[];
  const edges = pipeline.edges as unknown as DAGEdge[];

  if (!nodes || nodes.length === 0) throw new Error('Pipeline has no nodes');

  const run = await prisma.pipelineRun.create({
    data: {
      pipelineId,
      status: 'running',
      trigger,
      startedAt: new Date(),
    },
  });

  const edgeMap = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = edgeMap.get(edge.target) || [];
    existing.push(edge.source);
    edgeMap.set(edge.target, existing);
  }

  for (const node of nodes) {
    await prisma.nodeExecution.create({
      data: {
        runId: run.id,
        nodeId: node.id,
        nodeType: node.type,
        status: 'pending',
      },
    });
  }

  io?.to(`pipeline:${pipelineId}`).emit('run:started', {
    runId: run.id,
    pipelineId,
    trigger,
  });

  try {
    const levels = topologicalSort(nodes, edges);

    for (const level of levels) {
      await Promise.all(
        level.map(async (node) => {
          const upstreamNodeIds = edgeMap.get(node.id) || [];
          const upstreamOutputs = await getUpstreamOutputs(run.id, upstreamNodeIds);

          const nodeExecution = await prisma.nodeExecution.findFirst({
            where: { runId: run.id, nodeId: node.id },
          });

          if (!nodeExecution) return;

          await prisma.nodeExecution.update({
            where: { id: nodeExecution.id },
            data: {
              status: 'running',
              input: upstreamOutputs as any,
              startedAt: new Date(),
            },
          });

          io?.to(`pipeline:${pipelineId}`).emit('node:started', {
            runId: run.id,
            nodeId: node.id,
            nodeType: node.type,
          });

          const { executeNode } = await import('./nodeExecutors');
          const result = await executeWithRetry(
            () => executeNode(node, upstreamOutputs),
            node.id
          );

          if (result.error) {
            await prisma.nodeExecution.update({
              where: { id: nodeExecution.id },
              data: {
                status: 'failed',
                error: result.error,
                retryCount: result.retryCount,
                output: result.output as any,
                finishedAt: new Date(),
              },
            });

            io?.to(`pipeline:${pipelineId}`).emit('node:failed', {
              runId: run.id,
              nodeId: node.id,
              error: result.error,
              retryCount: result.retryCount,
            });

            throw new Error(`Node ${node.id} failed after ${result.retryCount} retries: ${result.error}`);
          }

          await prisma.nodeExecution.update({
            where: { id: nodeExecution.id },
            data: {
              status: 'completed',
              output: result.output as any,
              retryCount: result.retryCount,
              finishedAt: new Date(),
            },
          });

          await storeOutput(run.id, node.id, result.output);

          io?.to(`pipeline:${pipelineId}`).emit('node:completed', {
            runId: run.id,
            nodeId: node.id,
            output: result.output,
          });
        })
      );
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
      },
    });

    io?.to(`pipeline:${pipelineId}`).emit('run:completed', {
      runId: run.id,
      pipelineId,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
      },
    });

    io?.to(`pipeline:${pipelineId}`).emit('run:failed', {
      runId: run.id,
      pipelineId,
      error: errorMessage,
    });
  }

  return run.id;
}
