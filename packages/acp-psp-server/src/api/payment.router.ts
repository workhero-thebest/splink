import { Router, type Request, type Response } from 'express';
import { delegatedPaymentRequestSchema } from './validators.js';
import { paymentService } from '../services/index.js';
import {
  signatureVerificationMiddleware,
  idempotencyMiddleware,
} from '../middleware/index.js';

const router = Router();

// 環境変数からシークレットを取得（本番では適切な設定管理を使用）
const OPENAI_WEBHOOK_SECRET = process.env.OPENAI_WEBHOOK_SECRET || 'dev-secret';

/**
 * POST /agentic_commerce/delegate_payment
 *
 * ACPのDelegated Payment APIエンドポイント
 * OpenAIからの決済リクエストを処理する
 */
router.post(
  '/delegate_payment',
  signatureVerificationMiddleware(OPENAI_WEBHOOK_SECRET),
  idempotencyMiddleware,
  async (
    req: Request & { idempotencyKey?: string },
    res: Response
  ): Promise<void> => {
    // リクエストボディのバリデーション
    const parseResult = delegatedPaymentRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
      });
      return;
    }

    const request = parseResult.data;

    // 決済処理を実行
    const result = await paymentService.processDelegatedPayment(
      {
        paymentToken: request.paymentToken,
        merchantId: request.merchantId,
        amount: request.amount,
        currency: request.currency,
        cartDetails: request.cartDetails,
      },
      req.idempotencyKey
    );

    if (!result.success) {
      // エラーコードに応じたHTTPステータスを返す
      const statusCode = getStatusCodeForError(result.error.code);
      res.status(statusCode).json({ error: result.error });
      return;
    }

    res.status(200).json(result.response);
  }
);

/**
 * エラーコードに対応するHTTPステータスコードを返す
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'invalid_token':
    case 'token_expired':
    case 'token_already_used':
      return 400;
    case 'invalid_signature':
      return 401;
    case 'merchant_mismatch':
    case 'amount_exceeded':
      return 403;
    case 'payment_failed':
      return 502;
    case 'internal_error':
      return 500;
    default:
      return 400;
  }
}

export { router as paymentRouter };
