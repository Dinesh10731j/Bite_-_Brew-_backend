import { AppDataSource } from '../../configs/psqlDb.config';
import { AuditLog } from '../../entities/security/auditLog.entity';
import { AuditAction } from '../../constant/enum.constant';
import { envConfig } from '../../configs/env.config';

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  ipAddress?: string;
  sessionId?: string;
  deviceHash?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  description?: string;
  isHighRisk?: boolean;
}

/**
 * SecurityAuditService
 *
 * Provides structured security auditing with correlation IDs. Sensitive data
 * (passwords, tokens) is explicitly never logged. Persists to the audit_logs
 * table so operators can trace security-relevant actions.
 */
export class SecurityAuditService {
  private readonly enabled = envConfig.SECURITY_AUDIT_ENABLED;

  async audit(input: AuditLogInput): Promise<void> {
    if (!this.enabled) return;
    try {
      const repo = AppDataSource.getRepository(AuditLog);
      const record = repo.create({
        userId: input.userId,
        action: input.action,
        ipAddress: input.ipAddress,
        sessionId: input.sessionId,
        deviceHash: input.deviceHash,
        requestId: input.requestId,
        metadata: input.metadata,
        description: input.description,
        isHighRisk: input.isHighRisk ?? false,
      });
      await repo.save(record);
    } catch {
      // Audit persistence must never break the request flow.
    }
  }
}
