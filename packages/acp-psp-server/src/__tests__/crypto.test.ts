import { describe, it, expect } from 'vitest';
import { createSignature, verifyOpenAISignature, generateSecureToken } from '../utils/crypto.js';

describe('crypto utils', () => {
  describe('createSignature', () => {
    it('should create a consistent HMAC-SHA256 signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';

      const sig1 = createSignature(payload, secret);
      const sig2 = createSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 is 64 hex chars
    });

    it('should produce different signatures for different payloads', () => {
      const secret = 'test-secret';

      const sig1 = createSignature('payload1', secret);
      const sig2 = createSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const payload = 'test-payload';

      const sig1 = createSignature(payload, 'secret1');
      const sig2 = createSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyOpenAISignature', () => {
    it('should return true for valid signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const signature = `sha256=${createSignature(payload, secret)}`;

      expect(verifyOpenAISignature(payload, signature, secret)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const invalidSignature = 'sha256=invalid';

      expect(verifyOpenAISignature(payload, invalidSignature, secret)).toBe(false);
    });

    it('should return false for missing sha256= prefix', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const signatureWithoutPrefix = createSignature(payload, secret);

      expect(verifyOpenAISignature(payload, signatureWithoutPrefix, secret)).toBe(false);
    });

    it('should return false for tampered payload', () => {
      const originalPayload = '{"test": "data"}';
      const tamperedPayload = '{"test": "tampered"}';
      const secret = 'test-secret';
      const signature = `sha256=${createSignature(originalPayload, secret)}`;

      expect(verifyOpenAISignature(tamperedPayload, signature, secret)).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default prefix', () => {
      const token = generateSecureToken();

      expect(token).toMatch(/^spt_[A-Za-z0-9_-]+$/);
    });

    it('should generate token with custom prefix', () => {
      const token = generateSecureToken('pay');

      expect(token).toMatch(/^pay_[A-Za-z0-9_-]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }

      expect(tokens.size).toBe(100);
    });
  });
});
