import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { paymentRouter, tokenRouter, webhookRouter } from './api/index.js';
import { rawBodyMiddleware } from './middleware/index.js';

// 環境変数
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ロガー設定
const logger = pino({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Expressアプリケーション
const app = express();

// セキュリティミドルウェア
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-OpenAI-Signature',
      'Idempotency-Key',
    ],
  })
);

// リクエストロギング
app.use(pinoHttp({ logger }));

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// ACP Delegated Payment API（rawBodyが必要）
app.use('/agentic_commerce', rawBodyMiddleware, paymentRouter);

// トークン管理API
app.use('/tokens', express.json(), tokenRouter);

// Webhook管理API
app.use('/webhooks', express.json(), webhookRouter);

// 404ハンドラー
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'Endpoint not found',
    },
  });
});

// エラーハンドラー
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err, 'Unhandled error');
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: NODE_ENV === 'production' ? 'Internal server error' : err.message,
      },
    });
  }
);

// サーバー起動
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`ACP PSP Server running on port ${PORT}`);
    logger.info(`Environment: ${NODE_ENV}`);
  });
}

export { app };
