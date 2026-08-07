import { RefreshTokenService } from "../../../src/service/security/refreshToken.service";

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
      findOne: jest.fn().mockResolvedValue(null),
    }),
    isInitialized: true,
  },
}));

jest.mock("../../../src/configs/env.config", () => ({
  envConfig: {
    JWT_REFRESH_EXPIRES_IN: "30d",
  },
}));

describe("RefreshTokenService", () => {
  const service = new RefreshTokenService();

  describe("createRefreshToken", () => {
    it("creates a refresh token bound to a user and session", async () => {
      const result = await service.createRefreshToken("user-1", "session-1");
      expect(result.token).toBeTruthy();
      expect(result.tokenId).toBeTruthy();
      expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("verifyAndRotate", () => {
    it("throws for an invalid refresh token", async () => {
      await expect(service.verifyAndRotate("not-a-real-token")).rejects.toThrow(
        "INVALID_REFRESH_TOKEN",
      );
    });
  });
});
