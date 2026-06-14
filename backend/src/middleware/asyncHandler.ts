import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function handleServerError(
  res: Response,
  error: unknown,
  defaultMessage: string = 'Internal server error'
) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`${defaultMessage}:`, err.stack || err.message);
  res.status(500).json({
    message: defaultMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
