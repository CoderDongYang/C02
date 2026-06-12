import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const pipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  const pipelines = await prisma.pipeline.findMany({
    where: { userId: req.userId },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(pipelines);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const pipeline = await prisma.pipeline.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      nodes: true,
      edges: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!pipeline) {
    return res.status(404).json({ message: 'Pipeline not found' });
  }

  res.json(pipeline);
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const validated = pipelineSchema.parse(req.body);

    const pipeline = await prisma.pipeline.create({
      data: {
        name: validated.name,
        description: validated.description,
        nodes: validated.nodes as any,
        edges: validated.edges as any,
        userId: req.userId!,
      },
    });

    res.status(201).json(pipeline);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    throw error;
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const validated = pipelineSchema.parse(req.body);

    const existingPipeline = await prisma.pipeline.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existingPipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    const pipeline = await prisma.pipeline.update({
      where: { id: req.params.id },
      data: {
        name: validated.name,
        description: validated.description,
        nodes: validated.nodes as any,
        edges: validated.edges as any,
      },
    });

    res.json(pipeline);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    throw error;
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const existingPipeline = await prisma.pipeline.findFirst({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!existingPipeline) {
    return res.status(404).json({ message: 'Pipeline not found' });
  }

  await prisma.pipeline.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export default router;
