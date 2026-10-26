import request from 'supertest';
import app from '../app';

describe('LegalAI Auth API', () => {
  it('should respond 400 on invalid registration payload', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'invalid-email',
      password: '123',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return health check status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('UP');
  });
});
