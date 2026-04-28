import request from 'supertest';
import { createApp } from '../../src/configs/app';

describe('health endpoints', () => {
  const { app } = createApp();

  it('serves API health endpoint', async () => {
    const response = await request(app).get('/api/v1/bite-brew/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('serves kube probe endpoints', async () => {
    const [livez, readyz] = await Promise.all([request(app).get('/livez'), request(app).get('/readyz')]);
    expect(livez.status).toBe(200);
    expect(readyz.status).toBe(200);
  });
});
