import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { PipelineService } from '../services/pipeline.service';
import { config } from '../config';
import { logger } from '../config/logger';

const QUEUE_NAME = 'document-analysis-queue';
const pipelineService = new PipelineService();

let queue: Queue | null = null;
let worker: Worker | null = null;

export function initQueueWorker(): { enqueueJob: (documentId: string) => Promise<void> } {
  try {
    let redisAvailable = true;

    const connection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 2) {
          redisAvailable = false;
          return null;
        }
        return 1000;
      },
    });

    connection.on('error', (err) => {
      if (redisAvailable) {
        logger.warn(`[QueueWorker] Redis connection issue (${err.message}). Operating with direct in-process execution fallback.`);
        redisAvailable = false;
      }
    });

    queue = new Queue(QUEUE_NAME, { connection });

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info(`[QueueWorker] Processing job ${job.id} for document ${job.data.documentId}`);
        await pipelineService.processDocument(job.data.documentId);
      },
      { connection }
    );

    worker.on('completed', (job) => {
      logger.info(`[QueueWorker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[QueueWorker] Job ${job?.id} failed with error: ${err.message}`);
    });

    logger.info('[QueueWorker] BullMQ Redis worker initialized successfully.');

    return {
      enqueueJob: async (documentId: string) => {
        if (queue) {
          await queue.add('analyze-document', { documentId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        } else {
          setImmediate(() => pipelineService.processDocument(documentId));
        }
      },
    };
  } catch (err: any) {
    logger.warn(`[QueueWorker] Failed to setup Redis queue: ${err.message}. Running in-process async execution.`);

    return {
      enqueueJob: async (documentId: string) => {
        logger.info(`[QueueWorker] Dispatching in-process async analysis for document ${documentId}`);
        setImmediate(() => pipelineService.processDocument(documentId));
      },
    };
  }
}
