import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { UserRole } from "../../constant/enum.constant";
import { SignInDTO, SignUpDTO } from "../../dto/user/user.dto";
import { AuthRepository } from "../../repository/auth/auth.repository";
import { ServiceResult } from "../../types/service_result";
import { sendSmtpMail } from "../../configs/smtp.config";
import { buildResetPasswordTemplate, buildResetPasswordTextTemplate } from "../../templates/auth.template";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || "access_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || "refresh_secret";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async signup(dto: SignUpDTO) {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password.trim();
    const name = dto.name.trim();

    const existing = await this.authRepository.findByEmail(email);
    if (existing) {
      throw new Error(Message.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.authRepository.createUser({
      name,
      email,
      password: hashedPassword,
      role: UserRole.USER,
    });

    const access_token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      ACCESS_SECRET as jwt.Secret,
      { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions
    );
    const refresh_token = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET as jwt.Secret,
      { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      access_token,
      refresh_token,
    };
  }

  async signin(dto: SignInDTO) {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password.trim();

    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new Error(Message.INVALID_EMAIL_OR_PASSWORD);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new Error(Message.INVALID_EMAIL_OR_PASSWORD);
    }

    const access_token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
      ACCESS_SECRET as jwt.Secret,
      { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions
    );
    const refresh_token = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET as jwt.Secret,
      { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    return {
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET as jwt.Secret) as { userId: string };
    const user = await this.authRepository.findById(decoded.userId);
    if (!user) {
      throw new Error(Message.UNAUTHORIZED);
    }

    const access_token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      ACCESS_SECRET as jwt.Secret,
      { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions
    );

    const refresh_token = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET as jwt.Secret,
      { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    return { access_token, refresh_token };
  }

  async forgotPassword(email: string): Promise<ServiceResult<{ resetUrl?: string }>> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.authRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { status: HTTP_STATUS.NOT_FOUND };
    }

    const token = crypto.randomBytes(24).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await this.authRepository.saveUser(user);

    const frontendBase = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendBase.replace(/\/$/, "")}/reset-password?email=${encodeURIComponent(user.email)}&token=${token}`;
    const appName = process.env.APP_NAME || "Bite Brew Cafe";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "support@bitebrew.local";

    try {
      await sendSmtpMail({
        to: user.email,
        subject: `${appName} Password Reset`,
        html: buildResetPasswordTemplate({
          name: user.name || "User",
          resetUrl,
          appName,
          supportEmail,
          expiresInMinutes: 60,
        }),
        text: buildResetPasswordTextTemplate({
          name: user.name || "User",
          resetUrl,
          appName,
          supportEmail,
          expiresInMinutes: 60,
        }),
      });
    } catch (error) {
      // Log the reset URL to help debugging when SMTP isn't configured or fails
      console.error("Forgot password email delivery failed:", error);
      console.error("Password reset URL (for debugging):", resetUrl);
      return { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: "Unable to deliver password reset email" };
    }

    // Include resetUrl in service result `data` so callers (in non-production) can expose it for debugging
    return { status: HTTP_STATUS.OK, data: { resetUrl } };
  }

  async resetPassword(email: string, token: string, password: string): Promise<ServiceResult<null>> {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanedToken = token.trim();
    const cleanedPassword = password.trim();

    const user = await this.authRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { status: HTTP_STATUS.NOT_FOUND };
    }

    const invalidToken =
      !user.resetToken ||
      user.resetToken !== cleanedToken ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date();
    if (invalidToken) {
      return { status: HTTP_STATUS.BAD_REQUEST };
    }

    user.password = await bcrypt.hash(cleanedPassword, 10);
    delete user.resetToken;
    delete user.resetTokenExpiry;
    await this.authRepository.saveUser(user);

    return { status: HTTP_STATUS.OK };
  }
}
