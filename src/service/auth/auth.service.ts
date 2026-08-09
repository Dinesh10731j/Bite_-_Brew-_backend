import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getPerfTracker } from '../../perf/perfContext';

import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { UserRole, LoginStatus, SecurityEventType, AuditAction } from "../../constant/enum.constant";
import { SignInDTO, SignUpDTO } from "../../dto/user/user.dto";
import { AuthRepository } from "../../repository/auth/auth.repository";
import { ServiceResult } from "../../types/service_result";
import { sendSmtpMail } from "../../configs/smtp.config";
import { buildResetPasswordTemplate, buildResetPasswordTextTemplate } from "../../templates/auth.template";
import { envConfig } from "../../configs/env.config";
import { SessionService } from "../security/session.service";
import { DeviceService, DeviceFingerprintInput } from "../security/device.service";
import { RefreshTokenService } from "../security/refreshToken.service";
import { RegistrationProtectionService, RegistrationContext } from "../security/registrationProtection.service";
import { LoginMonitorService } from "../security/loginMonitor.service";
import { SecurityEventService } from "../security/securityEvent.service";
import { SecurityAuditService } from "../security/securityAudit.service";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || "access_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || "refresh_secret";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || envConfig.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || envConfig.JWT_REFRESH_EXPIRES_IN || "30d";

export interface AuthContext {
  ip: string;
  userAgent?: string;
  device?: DeviceFingerprintInput;
  country?: string;
  city?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  session_id: string;
}

export class AuthService {
  private readonly sessionService = new SessionService();
  private readonly deviceService = new DeviceService();
  private readonly refreshTokenService = new RefreshTokenService();
  private readonly registrationProtection = new RegistrationProtectionService();
  private readonly loginMonitor = new LoginMonitorService();
  private readonly securityEvent = new SecurityEventService();
  private readonly audit = new SecurityAuditService();

  constructor(private readonly authRepository: AuthRepository) {}

  /**
   * Sign up a new user with registration anti-abuse protection.
   */
  async signup(dto: SignUpDTO, ctx?: AuthContext) {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password.trim();
    const name = dto.name.trim();

    // Registration anti-abuse check.
    if (ctx) {
      const regCtx: RegistrationContext = {
        ip: ctx.ip,
        deviceHash: ctx.device?.visitorId ? this.deviceService.hashFingerprint(ctx.device) : undefined,
        email,
        userAgent: ctx.userAgent,
        country: ctx.country,
        city: ctx.city,
      };
      const check = await this.registrationProtection.checkRegistration(regCtx);
      if (!check.allowed) {
        await this.registrationProtection.recordRegistration(regCtx, check);
const err = new Error(Message.REGISTRATION_LIMIT_EXCEEDED) as Error & { statusCode?: number };
        err.statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        throw err;
      }
      await this.registrationProtection.recordRegistration(regCtx, { allowed: true, status: check.status });
    }

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

    await this.audit.audit({ userId: user.id, action: AuditAction.SIGNUP, ipAddress: ctx?.ip });
    await this.securityEvent.recordEvent({ userId: user.id, type: SecurityEventType.REGISTRATION, ipAddress: ctx?.ip, isHighRisk: false });

    // Create session + tokens for immediate sign-in.
    return this.issueTokens(user, ctx);
  }

  /**
   * Sign in an existing user with login monitoring, account lock, single-active-session.
   */
  async signin(dto: SignInDTO, ctx?: AuthContext): Promise<{ tokens: AuthTokens; user: { id: string; name: string; email: string; role: string }; revokedSessionId?: string }> {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password.trim();

    const tracker = getPerfTracker();

    const user = tracker
      ? await tracker.measure('database.user_lookup', () => this.authRepository.findByEmail(email))
      : await this.authRepository.findByEmail(email);

    if (!user) {
      await this.audit.audit({ action: AuditAction.LOGIN_FAILED, ipAddress: ctx?.ip, description: "unknown email" });
      throw new Error(Message.INVALID_EMAIL_OR_PASSWORD);
    }

    // Account lock check.
    if (this.loginMonitor.isAccountLocked(user)) {
      await this.securityEvent.recordEvent({ userId: user.id, type: SecurityEventType.ACCOUNT_LOCKED, ipAddress: ctx?.ip, isHighRisk: true });
      const err = new Error(Message.ACCOUNT_LOCKED) as Error & { statusCode?: number };
      err.statusCode = HTTP_STATUS.FORBIDDEN;
      throw err;
    }

    let ok: boolean;
    if (tracker) {
      ok = await tracker.measure('bcrypt.compare', () => bcrypt.compare(password, user.password));
    } else {
      ok = await bcrypt.compare(password, user.password);
    }
    if (!ok) {
      const { locked } = await this.loginMonitor.recordFailedLogin(user, ctx?.ip || "unknown");
      await this.audit.audit({ userId: user.id, action: AuditAction.LOGIN_FAILED, ipAddress: ctx?.ip });
      await this.securityEvent.recordEvent({ userId: user.id, type: SecurityEventType.LOGIN_FAILED, ipAddress: ctx?.ip, isHighRisk: true });
      if (locked) {
        const err = new Error(Message.ACCOUNT_LOCKED) as Error & { statusCode?: number };
        err.statusCode = HTTP_STATUS.FORBIDDEN;
        throw err;
      }
      throw new Error(Message.INVALID_EMAIL_OR_PASSWORD);
    }

    // Reset failed counters on success.
    await this.loginMonitor.resetFailedLogin(user, ctx?.ip || "unknown");

// Issue tokens + session (enforces single active session).
    const result = await this.issueTokens(user, ctx);

    // The device object is built/parsed inside issueTokens; use it to backfill
    // login history with clean browser/os/platform and the device hash.
    const device = this.deviceService.buildDevice(ctx?.device || {});
    await this.audit.audit({ userId: user.id, action: AuditAction.LOGIN, ipAddress: ctx?.ip });
    await this.loginMonitor.recordLoginHistory({
      userId: user.id,
      sessionId: result.tokens.session_id,
      deviceHash: device.deviceHash,
      ip: ctx?.ip || "unknown",
      country: ctx?.country,
      city: ctx?.city,
      browser: device.browser,
      os: device.os,
      platform: device.platform,
      status: LoginStatus.SUCCESS,
    });
    await this.securityEvent.recordEvent({ userId: user.id, type: SecurityEventType.LOGIN, ipAddress: ctx?.ip, sessionId: result.tokens.session_id });

    return {
      tokens: result.tokens,
      revokedSessionId: result.revokedSessionId,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  /**
   * Issue access token + refresh token + session for a user.
   * Enforces Netflix-style single active session.
   */
  private async issueTokens(user: { id: string }, ctx?: AuthContext): Promise<{ tokens: AuthTokens; revokedSessionId?: string }> {
    // Build device fingerprint.
    const device = this.deviceService.buildDevice(ctx?.device || {});
    const deviceHash = device.deviceHash;

    // Create session (single active session enforcement).
    const { session, revokedSessionId } = await this.sessionService.createSession({
      userId: user.id,
      deviceHash,
      ipAddress: ctx?.ip,
      browser: device.browser,
      os: device.os,
      platform: device.platform,
      screenResolution: device.screenResolution,
      timezone: device.timezone,
      language: device.language,
      userAgent: ctx?.userAgent,
      country: ctx?.country,
      city: ctx?.city,
    });

    // Persist device record.
    await this.deviceService.upsertDevice(device, user.id);
    await this.deviceService.rememberDevice(deviceHash);

    // Create refresh token (rotation).
    const refreshToken = await this.refreshTokenService.createRefreshToken(user.id, session.sessionId);

    // Build access token carrying sessionId.
    const access_token = jwt.sign(
      { userId: user.id, sessionId: session.sessionId, deviceHash, role: (user as { role?: string }).role },
      ACCESS_SECRET as jwt.Secret,
      { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions,
    );

    return {
      tokens: {
        access_token,
        refresh_token: refreshToken.token,
        session_id: session.sessionId,
      },
      revokedSessionId,
    };
  }

  /**
   * Refresh the access token with rotation + reuse detection.
   */
  async refreshAccessToken(refreshToken: string, ctx?: AuthContext): Promise<AuthTokens> {
    const { userId, sessionId, newToken } = await this.refreshTokenService.verifyAndRotate(refreshToken);

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new Error(Message.UNAUTHORIZED);
    }
    if (!user.isActive) {
      throw new Error(Message.FORBIDDEN);
    }
    if (this.loginMonitor.isAccountLocked(user)) {
      throw new Error(Message.ACCOUNT_LOCKED);
    }

    // Validate the session is still active.
    const validation = await this.sessionService.validateSession(userId, sessionId);
    if (!validation.valid) {
      throw new Error(Message.UNAUTHORIZED);
    }

    // Build a new access token for the same session.
    const access_token = jwt.sign(
      { userId: user.id, sessionId, deviceHash: validation.session?.deviceHash, role: user.role },
      ACCESS_SECRET as jwt.Secret,
      { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions,
    );

    await this.audit.audit({ userId, action: AuditAction.REFRESH_ROTATION, ipAddress: ctx?.ip, sessionId });
    await this.securityEvent.recordEvent({ userId, type: SecurityEventType.REFRESH_TOKEN_ROTATED, ipAddress: ctx?.ip, sessionId });

    return { access_token, refresh_token: newToken.token, session_id: sessionId };
  }

  /**
   * Logout: revoke the current session and refresh tokens.
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId, userId);
    await this.loginMonitor.markLogout(sessionId);
    await this.audit.audit({ userId, action: AuditAction.LOGOUT, sessionId });
    await this.securityEvent.recordEvent({ userId, type: SecurityEventType.LOGOUT, sessionId });
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
      console.error("Forgot password email delivery failed:", error);
      console.error("Password reset URL (for debugging):", resetUrl);
      return { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, error: "Unable to deliver password reset email" };
    }

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
    user.passwordChangedAt = new Date();
    delete user.resetToken;
    delete user.resetTokenExpiry;
    await this.authRepository.saveUser(user);

    // Password reset invalidates all sessions.
    await this.sessionService.revokeAllUserSessions(user.id, "password_reset");
    await this.refreshTokenService.revokeAllUserTokens(user.id, "password_reset");
    await this.audit.audit({ userId: user.id, action: AuditAction.PASSWORD_RESET });
    await this.securityEvent.recordEvent({ userId: user.id, type: SecurityEventType.PASSWORD_RESET, isHighRisk: true });

return { status: HTTP_STATUS.OK };
  }
}
