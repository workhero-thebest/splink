import type { Request, Response, NextFunction } from 'express';
import { verifyOpenAISignature } from '../utils/crypto.js';

const OPENAI_SIGNATURE_HEADER = 'x-openai-signature';

/**
 * OpenAI署名検証ミドルウェア
 *
 * リクエストヘッダーのX-OpenAI-Signatureを検証し、
 * 不正なリクエストを拒否する
 */
export function signatureVerificationMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers[OPENAI_SIGNATURE_HEADER];

    if (!signature || typeof signature !== 'string') {
      res.status(401).json({
        error: {
          code: 'invalid_signature',
          message: 'Missing X-OpenAI-Signature header',
        },
      });
      return;
    }

    // リクエストボディを文字列として取得
    const rawBody = (req as Request & { rawBody?: string }).rawBody;

    if (!rawBody) {
      res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Unable to verify signature: missing raw body',
        },
      });
      return;
    }

    const isValid = verifyOpenAISignature(rawBody, signature, secret);

    if (!isValid) {
      res.status(401).json({
        error: {
          code: 'invalid_signature',
          message: 'Invalid signature',
        },
      });
      return;
    }

    next();
  };
}

/**
 * rawBodyを保存するミドルウェア
 *
 * 署名検証のために元のリクエストボディを保存
 */
export function rawBodyMiddleware(
  req: Request & { rawBody?: string },
  _res: Response,
  next: NextFunction
): void {
  let data = '';

  req.on('data', (chunk: Buffer) => {
    data += chunk.toString();
  });

  req.on('end', () => {
    req.rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch {
      req.body = {};
    }
    next();
  });
}
