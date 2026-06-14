import schedule from 'node-schedule';
import type { PrismaClient } from '@prisma/client';
import { executePipeline } from '../engine/dagEngine';

const activeJobs = new Map<string, schedule.Job>();

export async function startScheduler(prisma: PrismaClient, io?: any) {
  const schedules = await prisma.schedule.findMany({
    where: { enabled: true },
  });

  for (const sched of schedules) {
    registerJob(sched.id, sched.pipelineId, sched.cronExpr, prisma, io);
  }

  console.log(`Scheduler started with ${schedules.length} active jobs`);
}

export function registerJob(
  scheduleId: string,
  pipelineId: string,
  cronExpr: string,
  prisma: PrismaClient,
  io?: any
) {
  stopJob(scheduleId);

  try {
    const job = schedule.scheduleJob(cronExpr, async () => {
      try {
        await executePipeline(prisma, pipelineId, 'schedule', io);
        await prisma.schedule.update({
          where: { id: scheduleId },
          data: { lastRunAt: new Date() },
        });
      } catch (err) {
        console.error(`Scheduled job ${scheduleId} failed:`, err);
      }
    });

    if (job) {
      activeJobs.set(scheduleId, job);

      const nextInvocations = job.pendingInvocations || [];
      const nextRun = nextInvocations.length > 0 ? (nextInvocations as any)[0]?.date : null;

      prisma.schedule.update({
        where: { id: scheduleId },
        data: { nextRunAt: nextRun || null },
      }).catch(() => {});

      console.log(`Registered schedule ${scheduleId}: "${cronExpr}" for pipeline ${pipelineId}`);
    } else {
      console.error(`Invalid cron expression for schedule ${scheduleId}: "${cronExpr}"`);
    }
  } catch (err) {
    console.error(`Failed to register schedule ${scheduleId}:`, err);
  }
}

export function stopJob(scheduleId: string) {
  const job = activeJobs.get(scheduleId);
  if (job) {
    job.cancel();
    activeJobs.delete(scheduleId);
    console.log(`Stopped schedule ${scheduleId}`);
  }
}

export function isJobActive(scheduleId: string): boolean {
  return activeJobs.has(scheduleId);
}

export function getNextRunTime(scheduleId: string): Date | null {
  const job = activeJobs.get(scheduleId);
  if (!job) return null;
  const nextInvocation = (job.pendingInvocations as any)?.[0];
  return nextInvocation?.date || null;
}

export function shutdownScheduler() {
  for (const [id, job] of activeJobs) {
    job.cancel();
    console.log(`Cancelled schedule ${id}`);
  }
  activeJobs.clear();
  console.log('Scheduler shut down');
}
