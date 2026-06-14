import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, handleServerError } from '../middleware/asyncHandler';

const router = Router();

const pipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

router.use(authMiddleware);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  try {
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
  } catch (error) {
    handleServerError(res, error, 'Failed to fetch pipelines');
  }
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  try {
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
  } catch (error) {
    handleServerError(res, error, 'Failed to fetch pipeline');
  }
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
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
    handleServerError(res, error, 'Failed to create pipeline');
  }
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
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
    handleServerError(res, error, 'Failed to update pipeline');
  }
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  try {
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
  } catch (error) {
    handleServerError(res, error, 'Failed to delete pipeline');
  }
}));

export default router;
