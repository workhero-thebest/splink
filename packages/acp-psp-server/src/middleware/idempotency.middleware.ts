import type { Request, Response, NextFunction } from 'express';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

/**
 * Idempotency-Keyを抽出するミドルウェア
 *
 * リクエストヘッダーからIdempotency-Keyを取得し、
 * req.idempotencyKeyとして利用可能にする
 */
export function idempotencyMiddleware(
  req: Request & { idempotencyKey?: string },
  _res: Response,
  next: NextFunction
): void {
  const key = req.headers[IDEMPOTENCY_KEY_HEADER];

  if (key && typeof key === 'string') {
    req.idempotencyKey = key;
  }

  next();
}
