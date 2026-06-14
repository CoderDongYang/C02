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

let redisClient: any = null;
let redisConnectionPromise: Promise<any> | null = null;
let redisAvailable = false;

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function initRedis(): Promise<boolean> {
  if (redisClient?.isOpen) return true;
  if (redisConnectionPromise) {
    return !!(await redisConnectionPromise);
  }

  redisConnectionPromise = (async () => {
    try {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              console.warn('Redis reconnection attempts exhausted. Using memory cache.');
              redisAvailable = false;
              return new Error('Stop reconnection');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      client.on('error', (err) => {
        console.warn('Redis Client Warning:', err.message);
        redisAvailable = false;
      });

      client.on('ready', () => {
        console.log('Redis connected successfully');
        redisAvailable = true;
      });

      client.on('end', () => {
        redisAvailable = false;
      });

      await client.connect();
      redisClient = client;
      redisAvailable = true;
      return client;
    } catch (err) {
      console.warn('Redis unavailable, falling back to memory cache:', err instanceof Error ? err.message : err);
      redisAvailable = false;
      return null;
    }
  })();

  return !!(await redisConnectionPromise);
}

export function isRedisAvailable(): boolean {
  return redisAvailable && !!(redisClient?.isOpen);
}

async function storeOutput(runId: string, nodeId: string, output: unknown): Promise<void> {
  const key = `${REDIS_KEY_PREFIX}${runId}:${nodeId}`;
  const value = JSON.stringify(output);

  if (isRedisAvailable() && redisClient) {
    try {
      await redisClient.set(key, value, { EX: REDIS_KEY_TTL });
      return;
    } catch (err) {
      console.warn('Redis set failed, using memory cache:', err instanceof Error ? err.message : err);
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + REDIS_KEY_TTL * 1000,
  });
}

async function getUpstreamOutputs(runId: string, upstreamNodeIds: string[]): Promise<Record<string, unknown>> {
  if (upstreamNodeIds.length === 0) return {};
  const results: Record<string, unknown> = {};

  if (isRedisAvailable() && redisClient) {
    try {
      for (const nodeId of upstreamNodeIds) {
        const key = `${REDIS_KEY_PREFIX}${runId}:${nodeId}`;
        const raw = await redisClient.get(key);
        if (raw) {
          results[nodeId] = JSON.parse(raw);
        }
      }
      return results;
    } catch (err) {
      console.warn('Redis get failed, falling back to memory cache:', err instanceof Error ? err.message : err);
    }
  }

  for (const nodeId of upstreamNodeIds) {
    const key = `${REDIS_KEY_PREFIX}${runId}:${nodeId}`;
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      results[nodeId] = JSON.parse(entry.value);
    }
  }

  return results;
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

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 60000);
