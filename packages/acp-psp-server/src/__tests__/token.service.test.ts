import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../services/token.service.js';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('generateToken', () => {
    it('should generate a token with valid structure', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);

      expect(token.tokenId).toMatch(/^spt_[A-Za-z0-9_-]+$/);
      expect(token.constraints).toEqual(constraints);
      expect(token.used).toBe(false);
      expect(token.createdAt).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);
      const result = tokenService.validateToken(
        token.tokenId,
        'merchant_123',
        5000,
        'JPY'
      );

      expect(result.valid).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should reject non-existent token', () => {
      const result = tokenService.validateToken(
        'spt_nonexistent',
        'merchant_123',
        5000,
        'JPY'
      );

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('invalid_token');
    });

    it('should reject used token', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);
      tokenService.markAsUsed(token.tokenId);

      const result = tokenService.validateToken(
        token.tokenId,
        'merchant_123',
        5000,
        'JPY'
      );

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('token_already_used');
    });

    it('should reject expired token', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() - 1000).toISOString(), // 過去の日時
      };

      const token = tokenService.generateToken(constraints);
      const result = tokenService.validateToken(
        token.tokenId,
        'merchant_123',
        5000,
        'JPY'
      );

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('token_expired');
    });

    it('should reject mismatched merchant', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);
      const result = tokenService.validateToken(
        token.tokenId,
        'merchant_456', // 異なるマーチャント
        5000,
        'JPY'
      );

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('merchant_mismatch');
    });

    it('should reject amount exceeding max', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);
      const result = tokenService.validateToken(
        token.tokenId,
        'merchant_123',
        15000, // maxAmountを超過
        'JPY'
      );

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('amount_exceeded');
    });

    it('should reject mismatched currency', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);
      const result = tokenService.validateToken(
        token.tokenId,
        'merchant_123',
        5000,
        'USD' // 異なる通貨
      );

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('invalid_request');
    });
  });

  describe('invalidateToken', () => {
    it('should invalidate existing token', () => {
      const constraints = {
        merchantId: 'merchant_123',
        maxAmount: 10000,
        currency: 'JPY',
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };

      const token = tokenService.generateToken(constraints);
      const deleted = tokenService.invalidateToken(token.tokenId);

      expect(deleted).toBe(true);
      expect(tokenService.getToken(token.tokenId)).toBeUndefined();
    });

    it('should return false for non-existent token', () => {
      const deleted = tokenService.invalidateToken('spt_nonexistent');

      expect(deleted).toBe(false);
    });
  });
});
