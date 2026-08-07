import { AppDataSource } from "../../configs/psqlDb.config";
import { SecurityEvent } from "../../entities/security/securityEvent.entity";
import { SecurityEventType } from "../../constant/enum.constant";

export interface SecurityEventInput {
  userId?: string;
  type: SecurityEventType;
  ipAddress?: string;
  deviceHash?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  description?: string;
  isHighRisk?: boolean;
}

/**
 * SecurityEventService
 *
 * Persists security events (login, logout, session creation/revocation,
 * refresh rotation, forced logout, device changes, account lock, etc.) for
 * auditing and monitoring. Never stores tokens or passwords.
 */
export class SecurityEventService {
  async recordEvent(input: SecurityEventInput): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(SecurityEvent);
      const event = repo.create({
        userId: input.userId,
        type: input.type,
        ipAddress: input.ipAddress,
        deviceHash: input.deviceHash,
        sessionId: input.sessionId,
        metadata: input.metadata,
        description: input.description,
        isHighRisk: input.isHighRisk ?? false,
      });
      await repo.save(event);
    } catch {
      // Security event persistence must never break the request flow.
    }
  }
}
