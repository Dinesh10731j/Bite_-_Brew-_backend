import { SessionService } from "../../../src/service/security/session.service";

jest.mock("../../../src/configs/redis.config", () => ({
  securityRedis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPrefix: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../src/configs/psqlDb.config", () => ({
  AppDataSource: {
    getRepository: () => ({
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    }),
    isInitialized: true,
  },
}));

jest.mock("../../../src/configs/env.config", () => ({
  envConfig: {
    SINGLE_ACTIVE_SESSION: true,
    SESSION_TTL_SECONDS: 2592000,
    IDLE_SESSION_TIMEOUT_SECONDS: 172800,
  },
}));

describe("SessionService", () => {
  const service = new SessionService();

  describe("generateSessionId", () => {
    it("generates a UUID session id", () => {
      const id = service.generateSessionId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("sessionTtlSeconds", () => {
    it("returns the configured session TTL", () => {
      expect(service.sessionTtlSeconds()).toBe(2592000);
    });
  });

  describe("validateSession", () => {
    it("returns invalid when no active session exists", async () => {
      const result = await service.validateSession("user-1", "session-1");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("session_not_found");
    });
  });
});
