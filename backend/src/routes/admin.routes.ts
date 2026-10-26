import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new AdminController();

// STRICT BACKEND RBAC: All /api/admin/* routes require valid authentication token AND ADMIN role
router.use(authenticateToken);
router.use(requireRole(Role.ADMIN));

router.get('/dashboard', (req, res, next) => controller.getDashboardMetrics(req, res, next));
router.get('/users', (req, res, next) => controller.getUsers(req, res, next));
router.patch('/users/:id/status', (req, res, next) => controller.updateUserStatus(req, res, next));
router.put('/users/:id/status', (req, res, next) => controller.updateUserStatus(req, res, next));
router.get('/documents', (req, res, next) => controller.getDocumentsMetadata(req, res, next));
router.get('/analytics', (req, res, next) => controller.getAnalytics(req, res, next));
router.get('/jobs', (req, res, next) => controller.getJobs(req, res, next));
router.get('/logs', (req, res, next) => controller.getAuditLogs(req, res, next));
router.get('/issues', (req, res, next) => controller.getIssues(req, res, next));
router.patch('/issues/:id', (req, res, next) => controller.updateIssueStatus(req, res, next));
router.put('/issues/:id', (req, res, next) => controller.updateIssueStatus(req, res, next));
router.get('/legal-sources', (req, res, next) => controller.getLegalSources(req, res, next));
router.post('/legal-sources', (req, res, next) => controller.addLegalSource(req, res, next));

export default router;
