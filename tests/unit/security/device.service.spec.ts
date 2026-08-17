import { DeviceService } from '../../../src/service/security/device.service';

describe('DeviceService', () => {
  const service = new DeviceService();

  describe('hashFingerprint', () => {
    it('returns a deterministic hash for the same input', () => {
      const input = {
        visitorId: 'abc123',
        platform: 'Windows',
        userAgent: 'Mozilla/5.0',
      };
      const hash1 = service.hashFingerprint(input);
      const hash2 = service.hashFingerprint(input);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns different hashes for different inputs', () => {
      const a = service.hashFingerprint({ visitorId: 'a' });
      const b = service.hashFingerprint({ visitorId: 'b' });
      expect(a).not.toBe(b);
    });

    it('falls back to userAgent when no signals are present', () => {
      const hash = service.hashFingerprint({ userAgent: 'test-ua' });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('parseUserAgent', () => {
    it('parses a standard user agent', () => {
      const parsed = service.parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      );
      expect(parsed.browser).toBeTruthy();
      expect(parsed.os).toBeTruthy();
      expect(parsed.platform).toBeTruthy();
    });

    it('returns Unknown for an empty user agent', () => {
      const parsed = service.parseUserAgent('');
      expect(parsed).toEqual({ browser: 'Unknown', os: 'Unknown', platform: 'Unknown' });
    });
  });

  describe('buildDevice', () => {
    it('builds a ParsedDevice with a valid deviceHash', () => {
      const device = service.buildDevice({
        visitorId: 'visitor-1',
        userAgent: 'Mozilla/5.0 Chrome/120.0',
        platform: 'Windows',
      });
      expect(device.deviceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(device.browser).toBeTruthy();
      expect(device.os).toBeTruthy();
    });
  });
});
