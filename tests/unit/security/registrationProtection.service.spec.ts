import { RegistrationProtectionService } from "../../../src/service/security/registrationProtection.service";
import { RegistrationStatus } from "../../../src/constant/enum.constant";

// Mock the AppDataSource and securityRedis dependencies.
jest.mock("../../../src/configs/psqlDb.config", () => ({
  AppDataSource: {
    getRepository: () => ({
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    }),
    isInitialized: true,
  },
}));

jest.mock("../../../src/configs/redis.config", () => ({
  securityRedis: {
    getCount: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
  },
}));

describe("RegistrationProtectionService", () => {
  const service = new RegistrationProtectionService();

  describe("checkRegistration", () => {
    it("allows a registration when no limits are exceeded", async () => {
      const result = await service.checkRegistration({
        ip: "1.2.3.4",
        deviceHash: "device-1",
      });
      expect(result.allowed).toBe(true);
      expect(result.status).toBe(RegistrationStatus.ALLOWED);
    });

    it("allows whitelisted IPs regardless of limits", async () => {
      process.env.REGISTRATION_WHITELIST = "10.0.0.1";
      const result = await service.checkRegistration({ ip: "10.0.0.1" });
      expect(result.allowed).toBe(true);
      expect(result.status).toBe(RegistrationStatus.ALLOWED);
      delete process.env.REGISTRATION_WHITELIST;
    });
  });
});
