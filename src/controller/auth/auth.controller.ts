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
      const { access_token, refresh_token } = await authService.signup(dto);
      const authCookieOptions = AuthController.getAuthCookieOptions(req);

      return res
        .cookie("access_token", access_token, {
          ...authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", refresh_token, {
          ...authCookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.CREATED)
        .json({ message: Message.USER_CREATED_SUCCESS });
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const e = err as { message?: string };
      if (e.message === Message.USER_ALREADY_EXISTS) {
        return res.status(HTTP_STATUS.CONFLICT).json({ message: Message.USER_ALREADY_EXISTS });
      }
      if (e.message === "Database not initialized") {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Server not ready. Please try again shortly." });
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

      const { access_token, refresh_token, user } = await authService.signin(dto);
      const authCookieOptions = AuthController.getAuthCookieOptions(req);


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
        .cookie("access_token", access_token, {
          ...authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", refresh_token, {
          ...authCookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.OK)
        .json({ message: Message.LOGIN_SUCCESS });
    } catch (err: unknown) {
      console.error("Signin failed:", err);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.INVALID_EMAIL_OR_PASSWORD });
    }
  }

  static async logout(req: Request, res: Response) {
    const authCookieOptions = AuthController.getAuthCookieOptions(req);

    return res
      .clearCookie("access_token", authCookieOptions)
      .clearCookie("accessToken", authCookieOptions)
      .clearCookie("token", authCookieOptions)
      .clearCookie("refresh_token", authCookieOptions)
      .clearCookie("refreshToken", authCookieOptions)
      .status(HTTP_STATUS.OK)
      .json({ message: Message.LOGOUT_SUCCESS });
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = (req.cookies?.refresh_token as string | undefined) || (req.body?.refresh_token as string | undefined);
      if (!refreshToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const authService = AuthController.createAuthService();
      const { access_token, refresh_token } = await authService.refreshAccessToken(refreshToken);
      const authCookieOptions = AuthController.getAuthCookieOptions(req);

      return res
        .cookie("access_token", access_token, {
          ...authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", refresh_token, {
          ...authCookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.OK)
        .json({ message: Message.SUCCESS });
    } catch (_err: unknown) {
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
      // In development, include the reset URL to help debugging when SMTP is not available
      const responseBody: any = { message: Message.RESET_EMAIL_SENT };
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


