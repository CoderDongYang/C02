import { Router } from 'express';
import { z } from 'zod';
import { prisma, io } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  registerJob,
  stopJob,
  isJobActive,
  getNextRunTime,
} from '../services/scheduler';

const router = Router();

router.use(authMiddleware);

const scheduleSchema = z.object({
  cronExpr: z.string().min(1),
  enabled: z.boolean().optional().default(true),
});

router.post('/:id/schedule', async (req: AuthRequest, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!pipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    const validated = scheduleSchema.parse(req.body);

    const sched = await prisma.schedule.create({
      data: {
        pipelineId: pipeline.id,
        cronExpr: validated.cronExpr,
        enabled: validated.enabled,
      },
    });

    if (validated.enabled) {
      registerJob(sched.id, pipeline.id, sched.cronExpr, prisma, io);
      const nextRun = getNextRunTime(sched.id);
      if (nextRun) {
        await prisma.schedule.update({
          where: { id: sched.id },
          data: { nextRunAt: nextRun },
        });
      }
    }

    const result = await prisma.schedule.findUnique({ where: { id: sched.id } });
    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    res.status(500).json({ message: err.message || 'Failed to create schedule' });
  }
});

router.get('/:id/schedules', async (req: AuthRequest, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!pipeline) {
      return res.status(404).json({ message: 'Pipeline not found' });
    }

    const schedules = await prisma.schedule.findMany({
      where: { pipelineId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = schedules.map((s) => ({
      ...s,
      isActive: isJobActive(s.id),
      nextRunAt: getNextRunTime(s.id) || s.nextRunAt,
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch schedules' });
  }
});

router.patch('/schedules/:scheduleId', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.schedule.findUnique({
      where: { id: req.params.scheduleId },
      include: { pipeline: { select: { userId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    if (existing.pipeline.userId !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateSchema = z.object({
      cronExpr: z.string().min(1).optional(),
      enabled: z.boolean().optional(),
    });

    const validated = updateSchema.parse(req.body);

    if (validated.enabled === false) {
      stopJob(existing.id);
    }

    const updated = await prisma.schedule.update({
      where: { id: req.params.scheduleId },
      data: {
        ...(validated.cronExpr && { cronExpr: validated.cronExpr }),
        ...(validated.enabled !== undefined && { enabled: validated.enabled }),
      },
    });

    if (updated.enabled) {
      registerJob(updated.id, existing.pipelineId, updated.cronExpr, prisma, io);
      const nextRun = getNextRunTime(updated.id);
      if (nextRun) {
        await prisma.schedule.update({
          where: { id: updated.id },
          data: { nextRunAt: nextRun },
        });
      }
    }

    const result = await prisma.schedule.findUnique({ where: { id: updated.id } });
    res.json({ ...result, isActive: isJobActive(updated.id) });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    res.status(500).json({ message: err.message || 'Failed to update schedule' });
  }
});

router.delete('/schedules/:scheduleId', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.schedule.findUnique({
      where: { id: req.params.scheduleId },
      include: { pipeline: { select: { userId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    if (existing.pipeline.userId !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    stopJob(existing.id);

    await prisma.schedule.delete({
      where: { id: req.params.scheduleId },
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete schedule' });
  }
});

export default router;
