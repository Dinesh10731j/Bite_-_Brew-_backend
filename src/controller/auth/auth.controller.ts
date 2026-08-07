import { Request, Response } from "express";
import { AuthService } from "../../service/auth/auth.service";
import { AuthRepository } from "../../repository/auth/auth.repository";

import { ForgotPasswordDTO, ResetPasswordDTO, SignInDTO, SignUpDTO } from "../../dto/user/user.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { ServiceResult } from "../../types/service_result";
import { UserRole } from "../../constant/enum.constant";
import { AdminLog } from "../../entities/auth/auth.entity";
import { AppDataSource } from "../../configs/psqlDb.config";
import { AuthContext } from "../../service/auth/auth.service";
import { ForceLogoutService } from "../../service/security/forceLogout.service";

const resolveClientIp = (req: Request): string => {
  const raw = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
  return (raw || "unknown").replace("::ffff:", "");
};

const buildAuthContext = (req: Request): AuthContext => {
  const deviceFingerprint = typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"] : undefined;
  return {
    ip: resolveClientIp(req),
    userAgent: req.get("user-agent"),
    device: {
      visitorId: deviceFingerprint,
      userAgent: req.get("user-agent"),
      platform: typeof req.headers["sec-ch-ua-platform"] === "string" ? req.headers["sec-ch-ua-platform"] : undefined,
      browser: typeof req.headers["sec-ch-ua"] === "string" ? req.headers["sec-ch-ua"] : undefined,
    },
  };
};

export class AuthController {
  private static createAuthService() {
    return new AuthService(new AuthRepository());
  }

  static getAuthCookieOptions(req: Pick<Request, "secure" | "headers">) {
    const forwardedProtoHeader = req.headers["x-forwarded-proto"];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const isHttpsRequest = Boolean(
      req.secure || forwardedProto === "https" || forwardedProto?.includes("https"),
    );
    const sameSite: "none" | "lax" = isHttpsRequest ? "none" : "lax";

    return {
      httpOnly: true as const,
      secure: isHttpsRequest,
      sameSite,
      path: "/" as const,
    };
  }

  static async signup(req: Request, res: Response) {
    try {
      const dto = plainToInstance(SignUpDTO, req.body) as SignUpDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);

      const authService = AuthController.createAuthService();
      const { tokens } = await authService.signup(dto, buildAuthContext(req));
      const authCookieOptions = AuthController.getAuthCookieOptions(req);

      return res
        .cookie("access_token", tokens.access_token, {
          ...authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", tokens.refresh_token, {
          ...authCookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .cookie("session_id", tokens.session_id, {
          ...authCookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.CREATED)
        .json({ message: Message.USER_CREATED_SUCCESS });
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const e = err as { message?: string };
      if (e.message === Message.USER_ALREADY_EXISTS) {
        return res.status(HTTP_STATUS.CONFLICT).json({ message: Message.USER_ALREADY_EXISTS });
      }
      if (e.message === Message.REGISTRATION_LIMIT_EXCEEDED || e.message === Message.REGISTRATION_DEVICE_LIMIT_EXCEEDED) {
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ message: e.message });
      }
      if (e.message === "Database not initialized") {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Server not ready. Please try again shortly." });
      }
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode && statusCode >= 400 && statusCode < 600) {
        return res.status(statusCode).json({ message: e.message || Message.INTERNAL_SERVER_ERROR });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: e.message || Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async signin(req: Request, res: Response) {
    try {
      const dto = plainToInstance(SignInDTO, req.body) as SignInDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);
      const authService = AuthController.createAuthService();

      const { tokens, user, revokedSessionId } = await authService.signin(dto, buildAuthContext(req));
      const authCookieOptions = AuthController.getAuthCookieOptions(req);

// Force-logout the previous session's socket if single-active-session replaced it.
      if (revokedSessionId) {
        const forceLogout = new ForceLogoutService();
        await forceLogout.forceLogoutSession(user.id, revokedSessionId, "signed_in_elsewhere");
      }

      if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
        const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
        const ip = (rawIp || "").replace("::ffff:", "");
        const log = new AdminLog();
        log.adminId = user.id;
        log.action = "LOGIN_SUCCESS";
        log.details = `IP: ${ip || "unknown"}, UA: ${req.get("User-Agent") || "unknown"}`;
        await AppDataSource.manager.save(log);
      }

      return res
        .cookie("access_token", tokens.access_token, {
          ...authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", tokens.refresh_token, {
          ...authCookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .cookie("session_id", tokens.session_id, {
          ...authCookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.OK)
        .json({ message: Message.LOGIN_SUCCESS, sessionId: tokens.session_id });
    } catch (err: unknown) {
      console.error("Signin failed:", err);
      const statusCode = (err as { statusCode?: number }).statusCode;
      const message = (err as { message?: string }).message;
      if (statusCode === HTTP_STATUS.FORBIDDEN) {
        return res.status(statusCode).json({ message });
      }
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: message || Message.INVALID_EMAIL_OR_PASSWORD });
    }
  }

  static async logout(req: Request, res: Response) {
    const authCookieOptions = AuthController.getAuthCookieOptions(req);
    const userId = req.user?.id;
    const sessionId = req.sessionId || (typeof req.cookies?.session_id === "string" ? req.cookies.session_id : undefined);

    if (userId && sessionId) {
      try {
        await AuthController.createAuthService().logout(userId, sessionId);
      } catch (e) {
        console.error("Logout session cleanup failed:", e);
      }
    }

    return res
      .clearCookie("access_token", authCookieOptions)
      .clearCookie("accessToken", authCookieOptions)
      .clearCookie("token", authCookieOptions)
      .clearCookie("refresh_token", authCookieOptions)
      .clearCookie("refreshToken", authCookieOptions)
      .clearCookie("session_id", authCookieOptions)
      .status(HTTP_STATUS.OK)
      .json({ message: Message.LOGOUT_SUCCESS });
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken =
        (req.cookies?.refresh_token as string | undefined) ||
        (req.cookies?.refreshToken as string | undefined) ||
        (req.body?.refresh_token as string | undefined);
      if (!refreshToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const authService = AuthController.createAuthService();
      const tokens = await authService.refreshAccessToken(refreshToken, buildAuthContext(req));
      const authCookieOptions = AuthController.getAuthCookieOptions(req);

      return res
        .cookie("access_token", tokens.access_token, {
          ...authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", tokens.refresh_token, {
          ...authCookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .cookie("session_id", tokens.session_id, {
          ...authCookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.OK)
        .json({ message: Message.SUCCESS });
    } catch (err: unknown) {
      if ((err as { message?: string }).message === Message.REFRESH_TOKEN_REUSE) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.REFRESH_TOKEN_REUSE });
      }
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const dto = plainToInstance(ForgotPasswordDTO, req.body) as ForgotPasswordDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);

      const authService = AuthController.createAuthService();
      const result: ServiceResult<{ resetUrl?: string } | null> = await authService.forgotPassword(dto.email);
      if (result.status === HTTP_STATUS.NOT_FOUND) {
        return res.status(result.status).json({ message: Message.USER_NOT_FOUND });
      }
      if (result.status !== HTTP_STATUS.OK) {
        return res.status(result.status).json({ message: Message.INTERNAL_SERVER_ERROR });
      }
      const responseBody: { message: string; debug?: { resetUrl?: string } } = { message: Message.RESET_EMAIL_SENT };
      if (process.env.NODE_ENV !== "production" && result.data?.resetUrl) {
        responseBody.debug = { resetUrl: result.data.resetUrl };
      }
      return res.status(result.status).json(responseBody);
    } catch (_err: unknown) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const dto = plainToInstance(ResetPasswordDTO, req.body) as ResetPasswordDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);
      if (dto.password !== dto.confirmPassword) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.INVALID_REQUEST });
      }

      const authService = AuthController.createAuthService();
      const result: ServiceResult<null> = await authService.resetPassword(dto.email, dto.token, dto.password);
      if (result.status === HTTP_STATUS.NOT_FOUND) {
        return res.status(result.status).json({ message: Message.USER_NOT_FOUND });
      }
      if (result.status === HTTP_STATUS.BAD_REQUEST) {
        return res.status(result.status).json({ message: Message.RESET_TOKEN_INVALID });
      }
      if (result.status !== HTTP_STATUS.OK) {
        return res.status(result.status).json({ message: Message.INTERNAL_SERVER_ERROR });
      }
      return res.status(result.status).json({ message: Message.PASSWORD_RESET_SUCCESS });
    } catch (_err: unknown) {
return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}
