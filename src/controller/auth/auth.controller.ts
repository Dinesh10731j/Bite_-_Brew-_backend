import { Request, Response } from "express";
import { AuthService } from "../../service/auth/auth.service";
import { AuthRepository } from "../../repository/auth/auth.repository";
import { ForgotPasswordDTO, ResetPasswordDTO, SignInDTO, SignUpDTO } from "../../dto/user/user.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { ServiceResult } from "../../types/service_result";

// Initialize AuthService
const authRepo = new AuthRepository();
const authService = new AuthService(authRepo);

export class AuthController {
  private static readonly authCookieOptions = {
    httpOnly: true as const,
    secure: false,
    sameSite: "strict" as const,
    path: "/",
  };

  static async signup(req: Request, res: Response) {
    try {
      const dto = plainToInstance(SignUpDTO, req.body) as SignUpDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);

      const {access_token, refresh_token } = await authService.signup(dto);

      res
        .cookie("access_token", access_token, {
          ...AuthController.authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", refresh_token, {
          ...AuthController.authCookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.CREATED)
        .json({ message: Message.USER_CREATED_SUCCESS });
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e.message === Message.USER_ALREADY_EXISTS ? Message.USER_ALREADY_EXISTS : Message.INVALID_REQUEST;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: msg });
    }
  }

  static async signin(req: Request, res: Response) {
    try {
      const dto = plainToInstance(SignInDTO, req.body) as SignInDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);

      const { access_token, refresh_token } = await authService.signin(dto);

      res
        .cookie("access_token", access_token, {
          ...AuthController.authCookieOptions,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refresh_token", refresh_token, {
          ...AuthController.authCookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .status(HTTP_STATUS.OK)
        .json({ message: Message.LOGIN_SUCCESS });
    } catch (_err: unknown) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: Message.INVALID_EMAIL_OR_PASSWORD });
    }
  }

  static async logout(_req: Request, res: Response) {
    return res
      .clearCookie("access_token", AuthController.authCookieOptions)
      .clearCookie("accessToken", AuthController.authCookieOptions)
      .clearCookie("token", AuthController.authCookieOptions)
      .clearCookie("refresh_token", AuthController.authCookieOptions)
      .clearCookie("refreshToken", AuthController.authCookieOptions)
      .status(HTTP_STATUS.OK)
      .json({ message: Message.LOGOUT_SUCCESS });
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const dto = plainToInstance(ForgotPasswordDTO, req.body) as ForgotPasswordDTO;
      const errors = await validate(dto);
      if (errors.length > 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(errors);

      const result: ServiceResult<null> = await authService.forgotPassword(dto.email);
      if (result.status === HTTP_STATUS.NOT_FOUND) {
        return res.status(result.status).json({ message: Message.USER_NOT_FOUND });
      }
      if (result.status !== HTTP_STATUS.OK) {
        return res.status(result.status).json({ message: Message.INTERNAL_SERVER_ERROR });
      }
      return res.status(result.status).json({ message: Message.RESET_EMAIL_SENT });
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


