import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import argon2 from 'argon2';
import { Role } from '@prisma/client';

describe('LegalAI Production RBAC & Security Enforcement', () => {
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;

  let userAId: string;
  let userBId: string;

  let docAId: string;

  beforeAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        email: { in: ['rbac_usera@legalai.com', 'rbac_userb@legalai.com', 'rbac_admin@legalai.com'] },
      },
    });

    const passHash = await argon2.hash('TestPass123!');

    // Create User A
    const userA = await prisma.user.create({
      data: {
        email: 'rbac_usera@legalai.com',
        name: 'RBAC User A',
        passwordHash: passHash,
        role: Role.USER,
      },
    });
    userAId = userA.id;

    // Create User B
    const userB = await prisma.user.create({
      data: {
        email: 'rbac_userb@legalai.com',
        name: 'RBAC User B',
        passwordHash: passHash,
        role: Role.USER,
      },
    });
    userBId = userB.id;

    // Create Admin User
    const admin = await prisma.user.create({
      data: {
        email: 'rbac_admin@legalai.com',
        name: 'RBAC Master Admin',
        passwordHash: passHash,
        role: Role.ADMIN,
      },
    });

    // Create Document for User A
    const docA = await prisma.document.create({
      data: {
        userId: userAId,
        filename: 'doca.pdf',
        originalName: 'Document_A.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'documents/rbac/doca.pdf',
      },
    });
    docAId = docA.id;

    // Login User A
    const resA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rbac_usera@legalai.com', password: 'TestPass123!' });
    userAToken = resA.body.data.tokens.accessToken;

    // Login User B
    const resB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rbac_userb@legalai.com', password: 'TestPass123!' });
    userBToken = resB.body.data.tokens.accessToken;

    // Login Admin
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rbac_admin@legalai.com', password: 'TestPass123!' });
    adminToken = resAdmin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { userId: userAId } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['rbac_usera@legalai.com', 'rbac_userb@legalai.com', 'rbac_admin@legalai.com'] },
      },
    });
    await prisma.$disconnect();
  });

  it('1. Public registration forces Role.USER and ignores requested ADMIN role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'rbac_new_user@legalai.com',
        name: 'Attempted Admin',
        password: 'TestPass123!',
        role: 'ADMIN', // Hacker attempt to register as ADMIN
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('USER'); // HARDCODED TO USER

    // Cleanup
    await prisma.user.delete({ where: { email: 'rbac_new_user@legalai.com' } });
  });

  it('2. Normal USER attempting to access Admin API receives HTTP 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Access Denied');
  });

  it('3. ADMIN user can access Admin API endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('4. User B cannot access User A document (Ownership Security Validation)', async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404); // Document not found for user B
  });

  it('5. User A can access their own document', async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(docAId);
  });

  it('6. Deactivated user account is blocked from login and API access', async () => {
    // Deactivate User B
    await prisma.user.update({ where: { id: userBId }, data: { isActive: false } });

    // Attempt Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rbac_userb@legalai.com', password: 'TestPass123!' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.message).toContain('deactivated');

    // Attempt Authenticated Token Request
    const apiRes = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(apiRes.status).toBe(403);
    expect(apiRes.body.error.message).toContain('deactivated');

    // Restore User B
    await prisma.user.update({ where: { id: userBId }, data: { isActive: true } });
  });
});
