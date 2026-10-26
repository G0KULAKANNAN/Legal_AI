import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { ReminderStatus } from '@prisma/client';

export class ReminderController {
  async getReminders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const reminders = await prisma.reminder.findMany({
        where: { userId },
        include: {
          document: {
            select: { id: true, originalName: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
      return sendSuccess(res, reminders);
    } catch (err) {
      next(err);
    }
  }

  async createReminder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { documentId, title, dueDate, notes } = req.body;

      if (!documentId || !title || !dueDate) {
        throw new BadRequestError('documentId, title, and dueDate are required');
      }

      const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
      if (!doc) {
        throw new NotFoundError('Document not found');
      }

      const reminder = await prisma.reminder.create({
        data: {
          userId,
          documentId,
          title,
          dueDate: new Date(dueDate),
          notes: notes || null,
          status: ReminderStatus.PENDING,
        },
      });

      return sendSuccess(res, reminder, 'Reminder created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateReminderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      if (!Object.values(ReminderStatus).includes(status)) {
        throw new BadRequestError('Invalid reminder status');
      }

      const reminder = await prisma.reminder.findFirst({ where: { id, userId } });
      if (!reminder) {
        throw new NotFoundError('Reminder not found');
      }

      const updated = await prisma.reminder.update({
        where: { id },
        data: { status: status as ReminderStatus },
      });

      return sendSuccess(res, updated, 'Reminder status updated');
    } catch (err) {
      next(err);
    }
  }

  async deleteReminder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const reminder = await prisma.reminder.findFirst({ where: { id, userId } });
      if (!reminder) {
        throw new NotFoundError('Reminder not found');
      }

      await prisma.reminder.delete({ where: { id } });
      return sendSuccess(res, null, 'Reminder deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
