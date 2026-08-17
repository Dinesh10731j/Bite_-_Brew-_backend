import request from 'supertest';
import { createApp } from '../../src/configs/app';
import { AppDataSource } from '../../src/configs/psqlDb.config';

describe('Auth integration flow', () => {
  let app: ReturnType<typeof createApp>['app'];

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    app = createApp().app;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('exposes the health endpoint', async () => {
    const res = await request(app).get('/api/v1/bite-brew/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects an unauthenticated /sessions request', async () => {
    const res = await request(app).get('/api/v1/bite-brew/sessions');
    expect([401, 403]).toContain(res.status);
  });

  it('rejects signup with invalid payload', async () => {
    const res = await request(app)
      .post('/api/v1/bite-brew/auth/signup')
      .send({ email: 'not-an-email', password: '123', name: 'T' });
    expect(res.status).toBe(400);
  });
});
