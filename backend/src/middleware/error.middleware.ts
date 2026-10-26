import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.statusCode}] Server error on ${req.method} ${req.url}: ${err.message}`, {
        stack: err.stack,
        url: req.url,
        method: req.method,
      });
    } else {
      logger.warn(`[${err.statusCode}] Client error on ${req.method} ${req.url}: ${err.message}`);
    }
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  logger.error(`Error occurred on ${req.method} ${req.url}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle Prisma database connection errors gracefully
  if (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientKnownRequestError' ||
    (err.message && err.message.includes("Can't reach database server"))
  ) {
    return sendError(
      res,
      'Database server unavailable. Please make sure PostgreSQL is running on port 5432.',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }

  // Handle SyntaxError or MulterError or unexpected errors
  if (err.name === 'SyntaxError') {
    return sendError(res, 'Malformed JSON payload', 400, 'BAD_REQUEST');
  }

  if (err.name === 'MulterError') {
    return sendError(res, `File upload error: ${err.message}`, 400, 'UPLOAD_ERROR');
  }

  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message || 'Internal Server Error';

  return sendError(res, message, 500, 'INTERNAL_ERROR');
}
