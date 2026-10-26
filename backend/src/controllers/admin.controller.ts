import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/prisma';
import { DocumentStatus } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

export class AdminController {
  async getDashboardMetrics(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      const totalDocuments = await prisma.document.count();
      const completedAnalyses = await prisma.document.count({ where: { status: DocumentStatus.COMPLETED } });
      const failedJobs = await prisma.document.count({ where: { status: DocumentStatus.FAILED } });
      const processingJobs = await prisma.document.count({
        where: { status: { in: [DocumentStatus.UPLOADED, DocumentStatus.EXTRACTING, DocumentStatus.OCR, DocumentStatus.ANALYZING] } },
      });

      const totalRisksDetected = await prisma.risk.count();
      const highRisksCount = await prisma.risk.count({ where: { riskLevel: 'HIGH' } });

      const totalStorageBytes = await prisma.document.aggregate({
        _sum: { fileSize: true },
      });

      const recentAuditLogs = await prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      });

      return sendSuccess(res, {
        overview: {
          totalUsers,
          activeUsers,
          totalDocuments,
          completedAnalyses,
          failedJobs,
          processingJobs,
          totalRisksDetected,
          highRisksCount,
          totalStorageBytes: totalStorageBytes._sum.fileSize || 0,
        },
        recentAuditLogs,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          preferredLanguage: true,
          createdAt: true,
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new BadRequestError('isActive field must be a boolean value');
      }

      if (req.user!.id === id && !isActive) {
        throw new ForbiddenError('System administrators cannot deactivate their own active account');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: { id: true, email: true, name: true, role: true, isActive: true, updatedAt: true },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: isActive ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_DEACTIVATED',
          resource: `User:${id}`,
          details: { targetEmail: user.email },
        },
      });

      return sendSuccess(res, updatedUser, `User account ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      next(err);
    }
  }

  async getDocumentsMetadata(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Return metadata ONLY (Strict Admin Privacy Control: NO raw text or clause contents exposed)
      const documents = await prisma.document.findMany({
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          status: true,
          detectedType: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, documents);
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const docsByStatus = await prisma.document.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      const risksByLevel = await prisma.risk.groupBy({
        by: ['riskLevel'],
        _count: { riskLevel: true },
      });

      const totalChats = await prisma.chatSession.count();
      const totalMessages = await prisma.chatMessage.count();

      return sendSuccess(res, {
        docsByStatus,
        risksByLevel,
        totalChats,
        totalMessages,
      });
    } catch (err) {
      next(err);
    }
  }

  async getJobs(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const jobs = await prisma.processingJob.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { document: { select: { originalName: true, userId: true, mimeType: true } } },
      });
      return sendSuccess(res, jobs);
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      });
      return sendSuccess(res, logs);
    } catch (err) {
      next(err);
    }
  }

  async getIssues(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const issues = await prisma.reportedIssue.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      });
      return sendSuccess(res, issues);
    } catch (err) {
      next(err);
    }
  }

  async updateIssueStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['OPEN', 'RESOLVED'].includes(status)) {
        throw new BadRequestError('Status must be either OPEN or RESOLVED');
      }

      const issue = await prisma.reportedIssue.findUnique({ where: { id } });
      if (!issue) {
        throw new NotFoundError('Reported issue not found');
      }

      const updated = await prisma.reportedIssue.update({
        where: { id },
        data: { status },
      });

      return sendSuccess(res, updated, `Issue status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  }

  async getLegalSources(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sources = await prisma.legalSource.findMany({
        orderBy: { act: 'asc' },
      });
      return sendSuccess(res, sources);
    } catch (err) {
      next(err);
    }
  }

  async addLegalSource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { act, section, title, description, applicability, sourceUrl } = req.body;
      const newSource = await prisma.legalSource.create({
        data: {
          act,
          section,
          title,
          description,
          applicability,
          sourceUrl,
        },
      });
      return sendSuccess(res, newSource, 'Legal source added successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}
