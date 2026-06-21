describe('cors configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
    delete process.env.FRONTEND_ORIGIN;
    delete process.env.CLIENT_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows deployed Netlify origins in production without extra env vars', () => {
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      const { isAllowedOrigin, resolvedCorsOrigins } = require('../../src/configs/cors.config') as typeof import('../../src/configs/cors.config');

      expect(resolvedCorsOrigins).toContain('https://bitebrewdashboard.netlify.app');
      expect(isAllowedOrigin('https://bitebrewdashboard.netlify.app')).toBe(true);
      expect(isAllowedOrigin('https://bitebrew.netlify.app')).toBe(true);
    });
  });

  it('does not allow localhost defaults in production', () => {
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      const { isAllowedOrigin } = require('../../src/configs/cors.config') as typeof import('../../src/configs/cors.config');

      expect(isAllowedOrigin('http://localhost:3000')).toBe(false);
    });
  });

  it('allows Socket.IO handshake requests from the deployed dashboard', () => {
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      const { socketOptions } = require('../../src/configs/socket.config') as typeof import('../../src/configs/socket.config');
      let allowed = false;

      socketOptions.allowRequest?.(
        { headers: { origin: 'https://bitebrewdashboard.netlify.app' } } as Parameters<NonNullable<typeof socketOptions.allowRequest>>[0],
        (_error, success) => {
          allowed = success;
        },
      );

      expect(allowed).toBe(true);
    });
  });
});
