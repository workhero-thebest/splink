# ACP実装要件書

**Issue #1関連**: 技術調査に基づく実装要件
**作成日**: 2026年4月16日

---

## 1. 実装スコープ

### 1.1 Phase 1: ACP基盤実装（最優先）

```
目標: ChatGPT Instant Checkout でSPLink加盟店の商品を購入可能にする
```

### 1.2 必須コンポーネント

```
┌─────────────────────────────────────────────────────────┐
│                    SPLink ACP System                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Delegated   │  │ Token       │  │ Webhook     │     │
│  │ Payment API │  │ Generator   │  │ Handler     │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│  ┌──────┴────────────────┴────────────────┴──────┐     │
│  │              Core Payment Engine               │     │
│  │   - 署名検証 / トークン管理 / 決済処理         │     │
│  └───────────────────────────────────────────────┘     │
│                          │                              │
│  ┌───────────────────────┴───────────────────────┐     │
│  │           Existing PSP Infrastructure          │     │
│  │   - 加盟店管理 / 決済処理 / 明細管理           │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. API仕様

### 2.1 Delegated Payment API

```yaml
Endpoint: POST /agentic_commerce/delegate_payment
Content-Type: application/json
Authorization: Bearer {api_key}

Headers:
  X-OpenAI-Signature: {HMAC-SHA256署名}
  Idempotency-Key: {UUID}

Request Body:
  {
    "payment_token": "spt_xxxxx",
    "merchant_id": "splink_merchant_123",
    "amount": 5000,
    "currency": "JPY",
    "cart_details": {
      "items": [...],
      "shipping": {...}
    },
    "constraints": {
      "max_amount": 10000,
      "valid_until": "2026-04-16T23:59:59Z"
    }
  }

Response (200 OK):
  {
    "payment_id": "pay_xxxxx",
    "status": "completed",
    "amount_charged": 5000,
    "currency": "JPY",
    "merchant_order_id": "order_12345"
  }

Error Response (4xx/5xx):
  {
    "error": {
      "code": "invalid_token",
      "message": "Payment token has expired"
    }
  }
```

### 2.2 署名検証

```python
import hmac
import hashlib

def verify_openai_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    OpenAIからのリクエスト署名を検証
    """
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected}", signature)
```

### 2.3 トークン生成

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
import secrets

@dataclass
class PaymentToken:
    token_id: str
    merchant_id: str
    max_amount: int
    currency: str
    valid_until: datetime
    allowed_payment_methods: list[str]

def generate_payment_token(
    merchant_id: str,
    max_amount: int,
    currency: str = "JPY",
    validity_minutes: int = 60,
    payment_methods: list[str] = None
) -> PaymentToken:
    """
    制約付き支払いトークンを生成
    """
    return PaymentToken(
        token_id=f"spt_{secrets.token_urlsafe(24)}",
        merchant_id=merchant_id,
        max_amount=max_amount,
        currency=currency,
        valid_until=datetime.utcnow() + timedelta(minutes=validity_minutes),
        allowed_payment_methods=payment_methods or ["credit_card", "convenience_store"]
    )
```

---

## 3. セキュリティ要件

### 3.1 認証・認可

| 要件 | 実装 |
|------|------|
| API認証 | Bearer Token + API Key |
| リクエスト署名 | HMAC-SHA256 |
| IPアドレス制限 | OpenAI許可リスト設定 |
| レート制限 | 1000 req/min per merchant |

### 3.2 PCI DSS準拠

| 要件 | ステータス | アクション |
|------|----------|----------|
| AOC（準拠証明書） | 要確認 | 現行の準拠状況を確認 |
| ペネトレーションテスト | 要実施 | 外部監査会社への依頼 |
| 暗号化通信 | TLS 1.2+ | 確認のみ |
| カードデータ保護 | トークン化 | 既存実装を確認 |

### 3.3 OpenAI署名検証

```
IP許可リスト（要確認）:
- OpenAIから提供されるIPレンジを設定
- WAF/ファイアウォールで制限
```

---

## 4. 冪等性対応

### 4.1 Idempotency-Key処理

```python
from redis import Redis
from functools import wraps

redis = Redis()

def idempotent(ttl_seconds: int = 86400):
    def decorator(func):
        @wraps(func)
        def wrapper(idempotency_key: str, *args, **kwargs):
            cache_key = f"idempotency:{idempotency_key}"

            # 既存の結果を確認
            cached = redis.get(cache_key)
            if cached:
                return json.loads(cached)

            # 処理実行
            result = func(*args, **kwargs)

            # 結果をキャッシュ
            redis.setex(cache_key, ttl_seconds, json.dumps(result))

            return result
        return wrapper
    return decorator
```

---

## 5. Webhook実装

### 5.1 ORDER_UPDATE通知

```yaml
Endpoint: POST /webhooks/acp/order_update
Content-Type: application/json

Events:
  - order.created
  - order.confirmed
  - order.shipped
  - order.delivered
  - order.cancelled
  - order.refunded

Payload:
  {
    "event": "order.shipped",
    "order_id": "order_12345",
    "merchant_id": "splink_merchant_123",
    "timestamp": "2026-04-16T10:30:00Z",
    "data": {
      "tracking_number": "JP123456789",
      "carrier": "yamato"
    }
  }
```

---

## 6. Store Sync機能（Phase 2）

### 6.1 商品カタログ同期

```yaml
# 加盟店の商品をAIプラットフォームへ連携

Data Model:
  Product:
    - id: string
    - name: string
    - description: string
    - price: number
    - currency: string
    - images: array[url]
    - availability: enum[in_stock, out_of_stock, preorder]
    - category: string
    - merchant_id: string

  Inventory:
    - product_id: string
    - quantity: number
    - warehouse_location: string
    - last_updated: datetime

Sync Endpoints:
  GET  /store_sync/products
  POST /store_sync/products/bulk_update
  POST /store_sync/inventory/update
```

### 6.2 AIプラットフォーム連携

```
連携先（将来）:
  - ChatGPT (OpenAI)
  - Copilot (Microsoft)
  - Perplexity
  - Gemini (Google) ※AP2経由

連携方式:
  - Push: 商品変更時に即時通知
  - Pull: 定期的なカタログ取得
  - Webhook: 在庫変動通知
```

---

## 7. 日本決済特有の考慮事項

### 7.1 コンビニ決済対応

```
課題: 非同期決済フローの処理
  - 支払いコード発行 → ユーザーがコンビニで支払い → 確認

解決策:
  1. Payment Pending状態の導入
  2. 支払い確認Webhookの実装
  3. タイムアウト処理（通常72時間）
```

### 7.2 銀行振込対応

```
課題: 振込確認の自動化
  - 仮想口座割当 → 振込 → 入金確認

解決策:
  1. 仮想口座管理システム連携
  2. 自動消込処理
  3. AP2の自律決済との親和性活用（将来）
```

---

## 8. テスト要件

### 8.1 統合テスト項目

| テスト | 説明 | 優先度 |
|--------|------|--------|
| 正常系：カード決済 | トークン発行→決済完了 | 最優先 |
| 正常系：コンビニ決済 | Pending→支払い確認→完了 | 高 |
| 異常系：トークン期限切れ | 適切なエラーレスポンス | 高 |
| 異常系：金額超過 | max_amount超過時の処理 | 高 |
| 異常系：不正署名 | 署名検証失敗時の拒否 | 最優先 |
| 冪等性テスト | 同一キーでの重複リクエスト | 高 |
| 負荷テスト | 1000 req/min 処理確認 | 中 |

### 8.2 OpenAI統合テスト

```
テスト環境:
  - OpenAI提供のサンドボックス環境
  - テスト用加盟店アカウント
  - モックAIエージェントでのE2Eテスト
```

---

## 9. 開発スケジュール案

### Phase 1: 基盤構築（3ヶ月）

| Week | タスク |
|------|--------|
| 1-2 | 技術設計・アーキテクチャ確定 |
| 3-4 | Delegated Payment API実装 |
| 5-6 | トークン生成・管理機能実装 |
| 7-8 | 署名検証・セキュリティ実装 |
| 9-10 | 冪等性・Webhook実装 |
| 11-12 | 統合テスト・バグ修正 |

### Phase 2: OpenAI統合（2ヶ月）

| Week | タスク |
|------|--------|
| 13-14 | OpenAIサンドボックス統合 |
| 15-16 | E2Eテスト・調整 |
| 17-18 | 本番承認・デプロイ準備 |
| 19-20 | 本番リリース・モニタリング |

### Phase 3: Store Sync（3ヶ月）

| Week | タスク |
|------|--------|
| 21-24 | カタログ管理API実装 |
| 25-28 | AIプラットフォーム連携実装 |
| 29-32 | 加盟店向けダッシュボード |

---

## 10. 必要リソース

### 10.1 人員

| 役割 | 人数 | 責務 |
|------|------|------|
| テックリード | 1 | 全体設計・技術判断 |
| バックエンドエンジニア | 2-3 | API実装・決済ロジック |
| セキュリティエンジニア | 1 | 認証・暗号化・監査対応 |
| QAエンジニア | 1 | テスト設計・実施 |
| プロジェクトマネージャー | 1 | 進捗管理・OpenAI連携 |

### 10.2 インフラ

| 項目 | 要件 |
|------|------|
| 本番環境 | 高可用性クラスタ（99.9% SLA） |
| キャッシュ | Redis（冪等性キー管理） |
| データベース | 既存DB + 新規テーブル |
| モニタリング | APM + ログ集約 + アラート |

---

## 11. 次のステップ

### 即座に実施

1. [ ] OpenAIへのPSP参加申請書作成
2. [ ] 社内技術チーム組成
3. [ ] PCI DSS現行ステータス確認
4. [ ] 詳細技術設計開始

### 1週間以内

1. [ ] OpenAI公式ドキュメントの精読
2. [ ] Stripe連携の検討（SPT使用可否）
3. [ ] 既存システムとの統合ポイント特定
4. [ ] 開発環境セットアップ

---

**作成者**: Claude Code
**最終更新**: 2026年4月16日
