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

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || "access_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || "refresh_secret";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async signup(dto: SignUpDTO) {
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error(Message.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.authRepository.createUser({
      name: dto.name,
      email: dto.email,
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
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error(Message.INVALID_EMAIL_OR_PASSWORD);
    }

    const ok = await bcrypt.compare(dto.password, user.password);
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

    return { access_token, refresh_token };
  }

  async forgotPassword(email: string): Promise<ServiceResult<null>> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      return { status: HTTP_STATUS.NOT_FOUND };
    }

    const token = crypto.randomBytes(24).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await this.authRepository.saveUser(user);

    const resetUrl = `${process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?email=${encodeURIComponent(user.email)}&token=${token}`;
    await sendSmtpMail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Hello ${user.name},</p><p>Use the link below to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return { status: HTTP_STATUS.OK };
  }

  async resetPassword(email: string, token: string, password: string): Promise<ServiceResult<null>> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      return { status: HTTP_STATUS.NOT_FOUND };
    }

    const invalidToken = !user.resetToken || user.resetToken !== token || !user.resetTokenExpiry || user.resetTokenExpiry < new Date();
    if (invalidToken) {
      return { status: HTTP_STATUS.BAD_REQUEST };
    }

    user.password = await bcrypt.hash(password, 10);
    delete user.resetToken;
    delete user.resetTokenExpiry;
    await this.authRepository.saveUser(user);

    return { status: HTTP_STATUS.OK };
  }
}
