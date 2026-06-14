import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, handleServerError } from '../middleware/asyncHandler';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/register', asyncHandler(async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { username: validated.username },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email or username already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        username: validated.username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN as string) || '7d' } as jwt.SignOptions
    );

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    handleServerError(res, error, 'Registration failed');
  }
}));

router.post('/login', asyncHandler(async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(validated.password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN as string) || '7d' } as jwt.SignOptions
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    handleServerError(res, error, 'Login failed');
  }
}));

export default router;
