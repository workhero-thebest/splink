import type { DelegatedPaymentResponse } from '../types/index.js';

/** 冪等性キャッシュエントリ */
interface IdempotencyEntry {
  response: DelegatedPaymentResponse;
  createdAt: Date;
}

/**
 * 冪等性管理サービス
 *
 * 同一のIdempotency-Keyを持つリクエストに対して
 * 同じレスポンスを返すことを保証する
 *
 * 本番環境ではRedis等の分散キャッシュを使用する
 */
export class IdempotencyService {
  private cache: Map<string, IdempotencyEntry> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    // デフォルト24時間
    this.ttlMs = ttlMs;

    // 定期的に期限切れエントリを削除
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // 1時間ごと
  }

  /**
   * キャッシュされたレスポンスを取得
   */
  get(key: string): DelegatedPaymentResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // TTLチェック
    if (Date.now() - entry.createdAt.getTime() > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.response;
  }

  /**
   * レスポンスをキャッシュ
   */
  set(key: string, response: DelegatedPaymentResponse): void {
    this.cache.set(key, {
      response,
      createdAt: new Date(),
    });
  }

  /**
   * キーが存在するかチェック
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 期限切れエントリを削除
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt.getTime() > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

// シングルトンインスタンス
export const idempotencyService = new IdempotencyService();
