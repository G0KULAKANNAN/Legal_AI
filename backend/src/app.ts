import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { sendSuccess } from './utils/response';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import reminderRoutes from './routes/reminder.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';

const app = express();

// Trust reverse proxy for rate-limiting & IP resolution in Vercel / Cloud environments
app.set('trust proxy', 1);

// Security headers & middleware
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl, same-origin)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production';

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow to avoid cross-domain Vercel preview blocking
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use('/api', apiRateLimiter);

// Health check endpoints (available at both root and /api for reverse proxy compatibility)
const healthHandler = (_req: express.Request, res: express.Response) =>
  sendSuccess(res, { status: 'UP', service: 'legalai-backend', timestamp: new Date() });
const readyHandler = (_req: express.Request, res: express.Response) =>
  sendSuccess(res, { status: 'READY' });

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/ready', readyHandler);
app.get('/api/ready', readyHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use('*', (_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API route not found' } }));

// Global Error Handler
app.use(errorHandler);

export default app;
