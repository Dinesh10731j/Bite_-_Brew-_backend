import crypto from "crypto";
import UAParser from "ua-parser-js";
import { AppDataSource } from "../../configs/psqlDb.config";
import { Device } from "../../entities/security/device.entity";
import { securityRedis } from "../../configs/redis.config";

export interface DeviceFingerprintInput {
  visitorId?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  ip?: string;
}

export interface ParsedDevice {
  deviceHash: string;
  browser: string;
  os: string;
  platform: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  userAgent?: string;
}

/**
 * DeviceService
 *
 * Responsibilities:
 *  - Hash device fingerprints (never rely on fingerprint alone for auth).
 *  - Parse User-Agent into browser/OS/platform.
 *  - Persist trusted devices and maintain a risk signal in Redis.
 */
export class DeviceService {
  /**
   * Hash a device fingerprint into a stable, non-reversible identifier.
   * Uses a HMAC with a server secret so the same fingerprint yields the
   * same hash across requests but cannot be reversed.
   */
  hashFingerprint(input: DeviceFingerprintInput): string {
    const secret = process.env.DEVICE_HASH_SECRET || process.env.JWT_ACCESS_SECRET || "device_hash_secret";
    const raw =
      [
        input.visitorId,
        input.platform,
        input.screenResolution,
        input.timezone,
        input.language,
        input.userAgent,
      ]
        .filter(Boolean)
        .join("|") || input.userAgent || "unknown";

    return crypto.createHmac("sha256", secret).update(raw).digest("hex");
  }

/**
   * Parse a User-Agent string into structured device metadata.
   */
  parseUserAgent(userAgent?: string): { browser: string; os: string; platform: string } {
    if (!userAgent) {
      return { browser: "Unknown", os: "Unknown", platform: "Unknown" };
    }
    const parser = new UAParser();
    const result = parser.setUA(userAgent).getResult();
    return {
      browser: result.browser?.name || "Unknown",
      os: result.os?.name || "Unknown",
      platform: result.device?.type || result?.os?.name || "Unknown",
    };
  }

  /**
   * Clean a raw `sec-ch-ua` header value into a human-readable browser name.
   * Example: `"Not=A?Brand";v="99", "Microsoft Edge";v="151", "Chromium";v="151"`
   *          -> `Microsoft Edge`
   */
  cleanBrowserName(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const value = raw.replace(/^"|"$/g, "").trim();
    if (!value) return undefined;
    // Prefer a known browser name over generic brands.
    const known = ["Edge", "Chrome", "Firefox", "Safari", "Opera", "Brave", "Vivaldi", "Chromium", "SamsungBrowser"];
    const found = known.find((b) => value.includes(b));
    if (found) {
      if (found === "Edge") return "Microsoft Edge";
      if (found === "SamsungBrowser") return "Samsung Internet";
      return found;
    }
    // Fall back to the first comma-separated segment, cleaned.
    const first = value.split(",")[0].replace(/^"|"$/g, "").replace(/;.*$/, "").trim();
    return first || undefined;
  }

  /**
   * Strip surrounding quotes from a client-provided value (e.g. `"Windows"` -> `Windows`).
   */
  cleanQuoted(value?: string | null): string | undefined {
    if (!value) return undefined;
    const cleaned = value.replace(/^"|"$/g, "").trim();
    return cleaned || undefined;
  }

  /**
   * Build a ParsedDevice from request-derived fingerprint input.
   */
  buildDevice(input: DeviceFingerprintInput): ParsedDevice {
    const parsed = this.parseUserAgent(input.userAgent);
    const deviceHash = this.hashFingerprint(input);
    return {
      deviceHash,
      browser: this.cleanBrowserName(input.browser) || parsed.browser,
      os: this.cleanQuoted(input.os) || parsed.os,
      platform: this.cleanQuoted(input.platform) || parsed.platform,
      screenResolution: this.cleanQuoted(input.screenResolution),
      timezone: this.cleanQuoted(input.timezone),
      language: this.cleanQuoted(input.language),
      userAgent: input.userAgent,
    };
  }

  /**
   * Persist or update a device record in the database.
   */
  async upsertDevice(device: ParsedDevice, userId?: string): Promise<Device> {
    const repo = AppDataSource.getRepository(Device);
    let record = await repo.findOne({ where: { deviceHash: device.deviceHash } });
    if (record) {
      record.browser = device.browser;
      record.os = device.os;
      record.platform = device.platform;
      record.screenResolution = device.screenResolution;
      record.timezone = device.timezone;
      record.language = device.language;
      record.userAgent = device.userAgent;
      record.lastSeenAt = new Date();
      if (userId) record.userId = userId;
      return repo.save(record);
    }

    const created = repo.create({
      deviceHash: device.deviceHash,
      userId,
      browser: device.browser,
      os: device.os,
      platform: device.platform,
      screenResolution: device.screenResolution,
      timezone: device.timezone,
      language: device.language,
      userAgent: device.userAgent,
      lastSeenAt: new Date(),
      riskScore: 0,
      riskLevel: "low",
      isTrusted: false,
    });
    return repo.save(created);
  }

  /**
   * Cache a device hash in Redis as a risk signal (TTL-based).
   */
  async rememberDevice(deviceHash: string, ttlSeconds = 30 * 24 * 60 * 60): Promise<void> {
    await securityRedis.setKeep("device", deviceHash, JSON.stringify({ seenAt: Date.now() }));
    void ttlSeconds;
  }

  /**
   * Delete a device from the database.
   */
  async deleteDevice(deviceHash: string): Promise<void> {
    const repo = AppDataSource.getRepository(Device);
    await repo.delete({ deviceHash });
    await securityRedis.del("device", deviceHash);
  }
}
