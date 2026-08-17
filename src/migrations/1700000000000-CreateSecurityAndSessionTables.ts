import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create security tables and extend the users table with
 * account-protection fields.
 *
 * Tables:
 *  - sessions
 *  - devices
 *  - refresh_tokens
 *  - login_history
 *  - registration_attempts
 *  - security_events
 *  - audit_logs
 *
 * Existing users table is altered to add:
 *  - emailVerified, isActive, failedLoginAttempts, lockedUntil,
 *    lastLoginAt, passwordChangedAt, emailVerifiedAt
 */
export class CreateSecurityAndSessionTables1700000000000 implements MigrationInterface {
  name = 'CreateSecurityAndSessionTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available for uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ----- Extend users table -----
    const userColumns = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
    );
    const existingUserColumns: string[] = userColumns.map(
      (c: { column_name: string }) => c.column_name,
    );

    if (!existingUserColumns.includes('emailVerified')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT false`,
      );
    }
    if (!existingUserColumns.includes('isActive')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true`,
      );
    }
    if (!existingUserColumns.includes('failedLoginAttempts')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" integer NOT NULL DEFAULT 0`,
      );
    }
    if (!existingUserColumns.includes('lockedUntil')) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "lockedUntil" TIMESTAMP NULL`);
    }
    if (!existingUserColumns.includes('lastLoginAt')) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP NULL`);
    }
    if (!existingUserColumns.includes('passwordChangedAt')) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP NULL`);
    }
    if (!existingUserColumns.includes('emailVerifiedAt')) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP NULL`);
    }

    // ----- sessions -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "sessionId" character varying(80) NOT NULL,
        "refreshTokenHash" character varying(128),
        "deviceHash" character varying(128),
        "deviceId" character varying(64),
        "ipAddress" character varying(64),
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "browser" character varying(128),
        "os" character varying(128),
        "platform" character varying(32),
        "screenResolution" character varying(32),
        "timezone" character varying(64),
        "language" character varying(32),
        "userAgent" text,
        "country" character varying(64),
        "city" character varying(64),
        "lastActivityAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "revokedAt" TIMESTAMP,
        "revokedReason" character varying(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_userId_status" ON "sessions" ("userId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_userId" ON "sessions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_sessionId" ON "sessions" ("sessionId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    // ----- devices -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "deviceHash" character varying(128) NOT NULL,
        "userId" character varying(128),
        "browser" character varying(128),
        "os" character varying(128),
        "platform" character varying(32),
        "screenResolution" character varying(32),
        "timezone" character varying(64),
        "language" character varying(32),
        "userAgent" text,
        "isTrusted" boolean NOT NULL DEFAULT false,
        "riskScore" integer NOT NULL DEFAULT 0,
        "riskLevel" character varying(32),
        "lastSeenAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_devices_deviceHash" UNIQUE ("deviceHash"),
        CONSTRAINT "PK_devices_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_devices_deviceHash" ON "devices" ("deviceHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_devices_userId" ON "devices" ("userId")`,
    );

    // ----- refresh_tokens -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenId" character varying(80) NOT NULL,
        "tokenHash" character varying(128) NOT NULL,
        "sessionId" character varying(80),
        "isRevoked" boolean NOT NULL DEFAULT false,
        "revokedAt" TIMESTAMP,
        "revokedReason" character varying(64),
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "replacedBy" character varying(80),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_tokens_tokenId" UNIQUE ("tokenId"),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    // ----- login_history -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "sessionId" character varying(80),
        "deviceId" character varying(128),
        "deviceHash" character varying(128),
        "browser" character varying(128),
        "os" character varying(128),
        "platform" character varying(32),
        "country" character varying(64),
        "city" character varying(64),
        "ipAddress" character varying(64),
        "status" character varying(20) NOT NULL DEFAULT 'success',
        "loginTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "logoutTime" TIMESTAMP,
        "failureReason" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_history_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_userId_loginTime" ON "login_history" ("userId", "loginTime")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_userId" ON "login_history" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_sessionId" ON "login_history" ("sessionId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "login_history" ADD CONSTRAINT "FK_login_history_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    // ----- registration_attempts -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "registration_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ipAddress" character varying(64) NOT NULL,
        "deviceHash" character varying(128),
        "email" character varying(180),
        "userAgent" text,
        "status" character varying(20) NOT NULL DEFAULT 'allowed',
        "reason" text,
        "country" character varying(64),
        "city" character varying(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_registration_attempts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_registration_attempts_ip_createdAt" ON "registration_attempts" ("ipAddress", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_registration_attempts_device_createdAt" ON "registration_attempts" ("deviceHash", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_registration_attempts_ip" ON "registration_attempts" ("ipAddress")`,
    );

    // ----- security_events -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "security_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(80),
        "type" character varying(40) NOT NULL,
        "ipAddress" character varying(64),
        "deviceHash" character varying(128),
        "sessionId" character varying(80),
        "metadata" jsonb,
        "description" text,
        "isHighRisk" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_security_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_security_events_userId_createdAt" ON "security_events" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_security_events_type_createdAt" ON "security_events" ("type", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_security_events_userId" ON "security_events" ("userId")`,
    );

    // ----- audit_logs -----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(80),
        "action" character varying(40) NOT NULL,
        "ipAddress" character varying(64),
        "sessionId" character varying(80),
        "deviceHash" character varying(128),
        "requestId" character varying(64),
        "metadata" jsonb,
        "description" text,
        "isHighRisk" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_userId_createdAt" ON "audit_logs" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_action_createdAt" ON "audit_logs" ("action", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_requestId" ON "audit_logs" ("requestId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "FK_sessions_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "login_history" DROP CONSTRAINT IF EXISTS "FK_login_history_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "login_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "registration_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "security_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);

    // Remove user columns
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerified"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "failedLoginAttempts"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lockedUntil"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordChangedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerifiedAt"`);
  }
}
