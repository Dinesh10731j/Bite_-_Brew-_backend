import request from 'supertest';
import { createApp } from '../../src/configs/app';
import { redisClient } from '../../src/configs/redis.config';

describe('cors', () => {
  const { app, io } = createApp();
  const dashboardOrigin = 'https://bitebrewdashboard.netlify.app';

  afterAll(() => {
    io.close();
    redisClient.disconnect();
  });

  it('answers auth preflight requests from the deployed dashboard', async () => {
    const response = await request(app)
      .options('/api/v1/bite-brew/auth/signin')
      .set('Origin', dashboardOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(dashboardOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
