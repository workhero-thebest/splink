# @splink/acp-psp-server

SPLink ACP (Agentic Commerce Protocol) PSP Server

ChatGPT等のAIプラットフォームからの決済リクエストを処理するPSPサーバー実装。

## 概要

このパッケージは、OpenAIとStripeが策定した[Agentic Commerce Protocol (ACP)](https://www.agenticcommerce.dev/)に準拠したPSPサーバーを提供します。

### 主な機能

- **Delegated Payment API**: AIエージェントからの決済リクエストを処理
- **署名検証**: HMAC-SHA256によるOpenAI署名の検証
- **支払いトークン管理**: 制約付きトークンの生成・検証・無効化
- **冪等性対応**: Idempotency-Keyによる重複リクエスト防止
- **Webhook**: ORDER_UPDATEイベントの配信

## クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# テスト実行
npm test

# ビルド
npm run build
```

## API エンドポイント

### Delegated Payment API

```
POST /agentic_commerce/delegate_payment
```

ACPの決済リクエストを処理します。

**ヘッダー**:
- `X-OpenAI-Signature`: HMAC-SHA256署名（必須）
- `Idempotency-Key`: 冪等性キー（推奨）

**リクエストボディ**:
```json
{
  "paymentToken": "spt_xxxxx",
  "merchantId": "merchant_123",
  "amount": 5000,
  "currency": "JPY",
  "cartDetails": {
    "items": [...],
    "total": 5000
  }
}
```

### トークン管理API

```
POST /tokens/generate     # トークン生成
GET  /tokens/:tokenId     # トークン取得
DELETE /tokens/:tokenId   # トークン無効化
```

### Webhook管理API

```
POST /webhooks/register   # Webhook登録
DELETE /webhooks/:id      # Webhook削除
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `PORT` | サーバーポート | 3000 |
| `NODE_ENV` | 環境 | development |
| `OPENAI_WEBHOOK_SECRET` | OpenAI署名検証用シークレット | dev-secret |
| `ALLOWED_ORIGINS` | CORS許可オリジン（カンマ区切り） | * |

## アーキテクチャ

```
src/
├── api/              # APIルーター
│   ├── payment.router.ts    # Delegated Payment API
│   ├── token.router.ts      # トークン管理API
│   └── webhook.router.ts    # Webhook管理API
├── services/         # ビジネスロジック
│   ├── payment.service.ts   # 決済処理
│   ├── token.service.ts     # トークン管理
│   └── idempotency.service.ts # 冪等性管理
├── middleware/       # ミドルウェア
│   ├── signature.middleware.ts  # 署名検証
│   └── idempotency.middleware.ts # 冪等性キー抽出
├── types/            # TypeScript型定義
│   └── acp.ts        # ACP関連の型
├── utils/            # ユーティリティ
│   └── crypto.ts     # 暗号化関連
└── index.ts          # エントリーポイント
```

## 本番環境への対応

このリファレンス実装を本番環境で使用する際は、以下の対応が必要です：

1. **永続化ストレージ**: トークン・冪等性キャッシュをRedis等に移行
2. **既存決済システム連携**: `PaymentService.executePayment()`を実装
3. **セキュリティ**: PCI DSS準拠の確認
4. **監視**: APM、ログ集約、アラートの設定
5. **スケーリング**: 高可用性構成の検討

## ライセンス

UNLICENSED - SPLink社内利用のみ
