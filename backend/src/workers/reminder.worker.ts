import { prisma } from '../config/prisma';
import { ReminderStatus } from '@prisma/client';
import { emailService } from '../services/email.service';
import { logger } from '../config/logger';

export class ReminderWorker {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  async checkAndDispatchReminders(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let dispatchedCount = 0;

    try {
      // Find all pending reminders where dueDate is now or in the next 24 hours
      const upcomingThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const dueReminders = await prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          dueDate: {
            lte: upcomingThreshold,
          },
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          document: {
            select: {
              id: true,
              originalName: true,
            },
          },
        },
      });

      if (dueReminders.length > 0) {
        logger.info(`[ReminderWorker] Found ${dueReminders.length} pending reminder(s) requiring notification.`);
      }

      for (const reminder of dueReminders) {
        try {
          if (!reminder.user || !reminder.user.email) continue;

          await emailService.sendReminderNotificationEmail({
            toEmail: reminder.user.email,
            name: reminder.user.name,
            documentName: reminder.document?.originalName || 'Legal Document',
            documentId: reminder.documentId,
            reminderTitle: reminder.title,
            dueDate: reminder.dueDate,
            notes: reminder.notes,
          });

          // Mark reminder as NOTIFIED
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: ReminderStatus.NOTIFIED },
          });

          dispatchedCount++;
          logger.info(`[ReminderWorker] Successfully notified user ${reminder.user.email} for reminder "${reminder.title}"`);
        } catch (err: any) {
          logger.error(`[ReminderWorker] Failed to dispatch reminder ${reminder.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      logger.error(`[ReminderWorker] Error in reminder scheduler run: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }

    return dispatchedCount;
  }

  start(intervalMs = 15 * 60 * 1000) {
    if (this.intervalTimer) return;

    logger.info('[ReminderWorker] Starting automated deadline reminder worker (interval: 15m)...');

    // Initial check after 10 seconds of server startup
    setTimeout(() => {
      this.checkAndDispatchReminders().catch(() => {});
    }, 10 * 1000);

    // Periodic check
    this.intervalTimer = setInterval(() => {
      this.checkAndDispatchReminders().catch(() => {});
    }, intervalMs);
  }

  stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      logger.info('[ReminderWorker] Stopped automated deadline reminder worker.');
    }
  }
}

export const reminderWorker = new ReminderWorker();
