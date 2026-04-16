import type { PaymentToken, PaymentTokenConstraints, ACPErrorCode } from '../types/index.js';
import { generateSecureToken } from '../utils/crypto.js';

/** トークン検証結果 */
export interface TokenValidationResult {
  valid: boolean;
  error?: {
    code: ACPErrorCode;
    message: string;
  };
  token?: PaymentToken;
}

/**
 * 支払いトークン管理サービス
 *
 * 本番環境ではRedis等の永続化ストレージを使用する
 */
export class TokenService {
  private tokens: Map<string, PaymentToken> = new Map();

  /**
   * 新しい支払いトークンを生成
   */
  generateToken(constraints: PaymentTokenConstraints): PaymentToken {
    const tokenId = generateSecureToken('spt');
    const token: PaymentToken = {
      tokenId,
      constraints,
      createdAt: new Date().toISOString(),
      used: false,
    };

    this.tokens.set(tokenId, token);
    return token;
  }

  /**
   * トークンを取得
   */
  getToken(tokenId: string): PaymentToken | undefined {
    return this.tokens.get(tokenId);
  }

  /**
   * トークンを使用済みにマーク
   */
  markAsUsed(tokenId: string): boolean {
    const token = this.tokens.get(tokenId);
    if (!token) {
      return false;
    }
    token.used = true;
    return true;
  }

  /**
   * トークンを無効化（削除）
   */
  invalidateToken(tokenId: string): boolean {
    return this.tokens.delete(tokenId);
  }

  /**
   * トークンを検証
   */
  validateToken(
    tokenId: string,
    merchantId: string,
    amount: number,
    currency: string
  ): TokenValidationResult {
    const token = this.tokens.get(tokenId);

    // トークンが存在しない
    if (!token) {
      return {
        valid: false,
        error: {
          code: 'invalid_token',
          message: 'Payment token not found',
        },
      };
    }

    // 使用済みチェック
    if (token.used) {
      return {
        valid: false,
        error: {
          code: 'token_already_used',
          message: 'Payment token has already been used',
        },
      };
    }

    // 有効期限チェック
    const validUntil = new Date(token.constraints.validUntil);
    if (validUntil < new Date()) {
      return {
        valid: false,
        error: {
          code: 'token_expired',
          message: 'Payment token has expired',
        },
      };
    }

    // マーチャントIDチェック
    if (token.constraints.merchantId !== merchantId) {
      return {
        valid: false,
        error: {
          code: 'merchant_mismatch',
          message: 'Payment token is not valid for this merchant',
        },
      };
    }

    // 通貨チェック
    if (token.constraints.currency !== currency) {
      return {
        valid: false,
        error: {
          code: 'invalid_request',
          message: `Currency mismatch: expected ${token.constraints.currency}, got ${currency}`,
        },
      };
    }

    // 金額チェック
    if (amount > token.constraints.maxAmount) {
      return {
        valid: false,
        error: {
          code: 'amount_exceeded',
          message: `Amount ${amount} exceeds maximum allowed ${token.constraints.maxAmount}`,
        },
      };
    }

    return {
      valid: true,
      token,
    };
  }
}

// シングルトンインスタンス
export const tokenService = new TokenService();
