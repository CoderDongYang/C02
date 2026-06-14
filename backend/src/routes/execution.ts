import { Router } from 'express';
import { prisma, io } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { executePipeline } from '../engine/dagEngine';

const router = Router();

router.use(authMiddleware);

router.post('/:id/run', async (req: AuthRequest, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!pipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    const nodes = pipeline.nodes as any[];
    if (!nodes || nodes.length === 0) {
      return res.status(400).json({ message: 'Pipeline has no nodes to execute' });
    }

    const runId = await executePipeline(prisma, pipeline.id, 'manual', io);

    const run = await prisma.pipelineRun.findUnique({
      where: { id: runId },
      include: { nodeExecutions: true },
    });

    res.status(201).json(run);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to execute pipeline' });
  }
});

router.get('/:id/runs', async (req: AuthRequest, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!pipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const [runs, total] = await Promise.all([
      prisma.pipelineRun.findMany({
        where: { pipelineId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          nodeExecutions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.pipelineRun.count({
        where: { pipelineId: req.params.id },
      }),
    ]);

    res.json({ runs, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch runs' });
  }
});

router.get('/runs/:runId', async (req: AuthRequest, res) => {
  try {
    const run = await prisma.pipelineRun.findUnique({
      where: { id: req.params.runId },
      include: {
        nodeExecutions: {
          orderBy: { createdAt: 'asc' },
        },
        pipeline: {
          select: { id: true, name: true, userId: true },
        },
      },
    });

    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    if (run.pipeline.userId !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(run);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch run' });
  }
});

router.post('/runs/:runId/cancel', async (req: AuthRequest, res) => {
  try {
    const run = await prisma.pipelineRun.findUnique({
      where: { id: req.params.runId },
      include: { pipeline: { select: { userId: true } } },
    });

    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    if (run.pipeline.userId !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (run.status !== 'running' && run.status !== 'pending') {
      return res.status(400).json({ message: 'Run is not in a cancellable state' });
    }

    const updated = await prisma.pipelineRun.update({
      where: { id: req.params.runId },
      data: {
        status: 'cancelled',
        finishedAt: new Date(),
      },
    });

    await prisma.nodeExecution.updateMany({
      where: {
        runId: req.params.runId,
        status: { in: ['pending', 'running'] },
      },
      data: { status: 'cancelled', finishedAt: new Date() },
    });

    io?.to(`pipeline:${run.pipelineId}`).emit('run:cancelled', {
      runId: run.id,
      pipelineId: run.pipelineId,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to cancel run' });
  }
});

export default router;
