import { Router, type Request, type Response } from 'express';
import { tokenGenerationRequestSchema } from './validators.js';
import { tokenService } from '../services/index.js';

const router = Router();

/**
 * POST /tokens/generate
 *
 * 支払いトークンを生成する
 * マーチャント向け内部API
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  // リクエストボディのバリデーション
  const parseResult = tokenGenerationRequestSchema.safeParse(req.body);

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

  const { merchantId, maxAmount, currency, validityMinutes, allowedPaymentMethods } =
    parseResult.data;

  // 有効期限を計算
  const validUntil = new Date(Date.now() + validityMinutes * 60 * 1000).toISOString();

  // トークンを生成
  const token = tokenService.generateToken({
    merchantId,
    maxAmount,
    currency,
    validUntil,
    allowedPaymentMethods,
  });

  res.status(201).json({
    tokenId: token.tokenId,
    constraints: token.constraints,
    createdAt: token.createdAt,
  });
});

/**
 * GET /tokens/:tokenId
 *
 * トークン情報を取得する
 */
router.get('/:tokenId', async (req: Request, res: Response): Promise<void> => {
  const { tokenId } = req.params;

  const token = tokenService.getToken(tokenId);

  if (!token) {
    res.status(404).json({
      error: {
        code: 'invalid_token',
        message: 'Token not found',
      },
    });
    return;
  }

  res.status(200).json({
    tokenId: token.tokenId,
    constraints: token.constraints,
    createdAt: token.createdAt,
    used: token.used,
  });
});

/**
 * DELETE /tokens/:tokenId
 *
 * トークンを無効化する
 */
router.delete('/:tokenId', async (req: Request, res: Response): Promise<void> => {
  const { tokenId } = req.params;

  const deleted = tokenService.invalidateToken(tokenId);

  if (!deleted) {
    res.status(404).json({
      error: {
        code: 'invalid_token',
        message: 'Token not found',
      },
    });
    return;
  }

  res.status(204).send();
});

export { router as tokenRouter };
