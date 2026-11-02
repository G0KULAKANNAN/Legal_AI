import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiting is disabled by default to prevent blocking legitimate requests,
// serverless IP collisions, and development/testing lockouts.
// Set ENABLE_RATE_LIMIT=true in environment variables only if strict rate limiting is desired.
const enableRateLimit = process.env.ENABLE_RATE_LIMIT === 'true';

const noopLimiter: RequestHandler = (_req, _res, next) => next();

export const apiRateLimiter: RequestHandler = enableRateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests from this IP, please try again after 15 minutes',
        },
      },
    })
  : noopLimiter;

export const authRateLimiter: RequestHandler = enableRateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many authentication attempts. Please try again after 15 minutes.',
        },
      },
    })
  : noopLimiter;

export const aiRateLimiter: RequestHandler = enableRateLimit
  ? rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Hourly AI document processing quota exceeded for your connection. Please wait before analyzing more documents.',
        },
      },
    })
  : noopLimiter;
