import { SessionController } from "../../../src/controller/session/session.controller";
import { HTTP_STATUS } from "../../../src/constant/statusCode.interface";

jest.mock("../../../src/service/security/session.service", () => ({
  SessionService: jest.fn().mockImplementation(() => ({
    listSessions: jest.fn().mockResolvedValue([
      {
        sessionId: "sess-1",
        status: "active",
        browser: "Chrome",
        os: "Windows",
        platform: "desktop",
        deviceHash: "hash-1",
        ipAddress: "1.2.3.4",
        lastActivityAt: new Date(),
        createdAt: new Date(),
      },
    ]),
    revokeSessionById: jest.fn().mockResolvedValue(true),
    revokeSessionsExcept: jest.fn().mockResolvedValue(["sess-2"]),
    revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../../src/service/security/refreshToken.service", () => ({
  RefreshTokenService: jest.fn().mockImplementation(() => ({
    revokeBySessionPublic: jest.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../../src/service/security/forceLogout.service", () => ({
  ForceLogoutService: jest.fn().mockImplementation(() => ({
    forceLogoutSession: jest.fn().mockResolvedValue(undefined),
    forceLogoutAllForUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

describe("SessionController", () => {
  describe("list", () => {
    it("returns unauthorized when no user", async () => {
      const req = { user: undefined, sessionId: undefined, cookies: {} } as any;
      const res = mockResponse();
      await SessionController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });

    it("lists active sessions for an authenticated user", async () => {
      const req = { user: { id: "user-1" }, sessionId: "sess-1", cookies: {} } as any;
      const res = mockResponse();
      await SessionController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Array) }),
      );
    });
  });

  describe("revoke", () => {
    it("revokes a selected session", async () => {
      const req = { user: { id: "user-1" }, params: { sessionId: "sess-1" } } as any;
      const res = mockResponse();
      await SessionController.revoke(req, res);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });
  });

  describe("revokeOthers", () => {
    it("revokes all sessions except current", async () => {
      const req = { user: { id: "user-1" }, sessionId: "sess-1", cookies: {} } as any;
      const res = mockResponse();
      await SessionController.revokeOthers(req, res);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedCount: 1 } }),
      );
    });
  });

  describe("logoutAll", () => {
    it("revokes all sessions and clears cookies", async () => {
      const req = { user: { id: "user-1" }, secure: false } as any;
      const res = mockResponse();
      await SessionController.logoutAll(req, res);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.clearCookie).toHaveBeenCalledTimes(3);
    });
  });
});
