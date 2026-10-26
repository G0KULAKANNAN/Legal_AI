import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../config/logger';

interface PendingRegistration {
  otp: string;
  name: string;
  email: string;
  passwordHash: string;
  preferredLanguage?: string;
  expiresAt: number;
}

export class OtpService {
  private redis: Redis | null = null;
  private memoryStore: Map<string, PendingRegistration> = new Map();

  constructor() {
    try {
      this.redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 3) return null;
          return 1000;
        },
      });

      this.redis.on('error', (err) => {
        logger.warn(`[OtpService] Redis connection warning: ${err.message}. Relying on memory fallback.`);
      });
    } catch (e: any) {
      logger.warn(`[OtpService] Could not connect to Redis: ${e.message}. Using memory store.`);
    }

    // Cleanup expired memory items every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.memoryStore.entries()) {
        if (val.expiresAt < now) {
          this.memoryStore.delete(key);
        }
      }
    }, 60 * 1000);
  }

  async savePendingRegistration(data: PendingRegistration): Promise<void> {
    const key = `register_otp:${data.email.toLowerCase()}`;
    const ttlSeconds = Math.max(1, Math.floor((data.expiresAt - Date.now()) / 1000));

    // Save to memory store
    this.memoryStore.set(key, data);

    // Try Redis
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
      } catch (err: any) {
        logger.warn(`[OtpService] Redis save failed: ${err.message}. Memory store retained.`);
      }
    }
  }

  async getPendingRegistration(email: string): Promise<PendingRegistration | null> {
    const key = `register_otp:${email.toLowerCase()}`;

    // Check Redis first
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          return JSON.parse(raw) as PendingRegistration;
        }
      } catch (err: any) {
        logger.warn(`[OtpService] Redis get failed: ${err.message}. Checking memory store.`);
      }
    }

    // Check memory store
    const item = this.memoryStore.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item;
    }

    return null;
  }

  async deletePendingRegistration(email: string): Promise<void> {
    const key = `register_otp:${email.toLowerCase()}`;
    this.memoryStore.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (_) {}
    }
  }
}

export const otpService = new OtpService();
