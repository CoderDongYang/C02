import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth';
import pipelineRoutes from './routes/pipeline';
import executionRoutes from './routes/execution';
import scheduleRoutes from './routes/schedule';
import { errorHandler } from './middleware/errorHandler';
import { getRedisClient } from './engine/dagEngine';
import { startScheduler, shutdownScheduler } from './services/scheduler';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/pipelines', executionRoutes);
app.use('/api/pipelines', scheduleRoutes);

app.get('/api/health', async (req, res) => {
  let redisStatus = 'disconnected';
  try {
    const redis = await getRedisClient();
    await redis.ping();
    redisStatus = 'connected';
  } catch {}

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisStatus,
  });
});

app.use(errorHandler);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    (socket as any).userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log('Client connected:', socket.id, 'user:', userId);

  socket.on('subscribe:pipeline', (pipelineId: string) => {
    socket.join(`pipeline:${pipelineId}`);
    console.log(`Socket ${socket.id} subscribed to pipeline:${pipelineId}`);
  });

  socket.on('unsubscribe:pipeline', (pipelineId: string) => {
    socket.leave(`pipeline:${pipelineId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    await getRedisClient();
    console.log('Redis connected successfully');

    await startScheduler(prisma, io);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  shutdownScheduler();
  server.close();
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  shutdownScheduler();
  server.close();
  prisma.$disconnect();
  process.exit(0);
});

startServer();

export { prisma, io };
