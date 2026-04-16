# Issue 3: Store Sync 技術調査レポート

**調査日**: 2026年4月16日
**ブランチ**: `feature/issue-3-store-sync-technical-investigation`
**ステータス**: 調査完了

---

## 1. エグゼクティブサマリー

Store Sync（商品カタログ一元管理・AI連携機能）の技術調査を実施。SPLinkが独自のStore Syncを構築し、日本市場のハブとなるための技術要件を明確化した。

### 主要な発見事項

| 項目 | 内容 |
|------|------|
| **ACPとAP2の違い** | ACP（OpenAI/Stripe）は即時決済向け、AP2（Google）は非同期・自律購買向け |
| **商品データ標準** | Schema.org Product、Google Product Data Specが業界標準 |
| **同期アーキテクチャ** | Webhook + Pollingのハイブリッド方式を推奨 |
| **日本市場要件** | 税込価格表示、JANコード、コンビニ決済対応が必須 |
| **MCPとAP2の関係** | MCPはAIコンテキスト共有、AP2は決済プロトコル（別物だが補完的） |

---

## 2. Store Syncの技術的定義

### 2.1 機能概要

Store Syncは以下の機能を提供するシステム：

```
┌─────────────────────────────────────────────────────────────┐
│                      Store Sync                              │
├─────────────────────────────────────────────────────────────┤
│  1. カタログ収集   │ 加盟店の商品情報を収集・正規化          │
│  2. データ変換     │ 各AIプラットフォーム形式に変換          │
│  3. マルチ配信     │ ChatGPT、Gemini、Claude等へ一括配信    │
│  4. 在庫同期       │ リアルタイム在庫更新                    │
│  5. 決済連携       │ ACP/AP2プロトコル対応                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 アーキテクチャ全体図

```
┌─────────────────────────────────────────────────────────────┐
│  SPLink 加盟店                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ 加盟店A   │  │ 加盟店B   │  │ 加盟店C   │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │
        │ REST API / Webhook / Feed
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│              SPLink Store Sync Platform                      │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Catalog Service                                         │ │
│  │ • 商品データ収集・正規化                                 │ │
│  │ • 在庫管理・価格管理                                    │ │
│  │ • Schema.org互換フォーマット変換                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Sync Engine                                             │ │
│  │ • Webhook受信・Polling補完                              │ │
│  │ • 変更検知・差分配信                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ AI Channel Adapters                                     │ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │ │
│  │ │ChatGPT  │ │Gemini   │ │Claude   │ │Perplexity│      │ │
│  │ │(ACP)    │ │(AP2)    │ │(MCP)    │ │         │      │ │
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Payment Integration                                     │ │
│  │ • Delegated Payment API (ACP)                          │ │
│  │ • AP2 Payment Token                                    │ │
│  │ • 日本固有決済（コンビニ・銀行振込）                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  ChatGPT  │ │  Gemini   │ │  Claude   │ │ Perplexity│
│  (OpenAI) │ │ (Google)  │ │(Anthropic)│ │           │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
```

---

## 3. プロトコル比較: ACP vs AP2 vs MCP

### 3.1 概要比較

| 項目 | ACP | AP2 | MCP |
|------|-----|-----|-----|
| **主導者** | OpenAI / Stripe | Google / Visa / JCB | Anthropic |
| **目的** | 即時決済 | 自律購買 | AIコンテキスト共有 |
| **ユースケース** | チャット経由購入 | エージェント自動購入 | 汎用AI連携 |
| **決済タイミング** | 同期（即時） | 非同期対応 | N/A（決済非対応） |
| **署名方式** | HMAC-SHA256 | 公開鍵暗号（RS256/ES256） | OAuth 2.0ベース |
| **日本市場適合性** | ○（クレカ中心） | ◎（コンビニ・銀振対応） | ○ |

### 3.2 ACP（Agentic Commerce Protocol）詳細

**実装すべきエンドポイント:**

```http
# Delegated Payment API（必須）
POST /agentic_commerce/delegate_payment

# Product Catalog API（Store Sync用）
GET  /agentic_commerce/products
GET  /agentic_commerce/products/{product_id}
GET  /agentic_commerce/products/{product_id}/availability

# Webhook（注文更新通知）
POST /webhooks/order_update
```

**署名検証（HMAC-SHA256）:**

```python
import hmac
import hashlib

def verify_openai_signature(request):
    secret_key = get_openai_secret_key()
    request_body = request.get_body()
    received_signature = request.headers.get('X-OpenAI-Signature')
    timestamp = request.headers.get('X-OpenAI-Timestamp')

    payload = f"{timestamp}.{request_body}"
    expected_signature = hmac.new(
        secret_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, received_signature)
```

### 3.3 AP2（Agent Payments Protocol）詳細

**決済フロー:**

```
Phase 1: 認証
POST /ap2/v1/auth/initiate → sessionId取得

Phase 2: トークン生成
POST /ap2/v1/payment/token → paymentToken取得

Phase 3: 購入実行
POST /ap2/v1/payment/execute → transactionId取得

Phase 4: Webhook通知
POST /webhook/order-update → 注文ステータス受信
```

**AP2の日本市場メリット:**
- コンビニ決済・銀行振込など非同期決済に最適
- JCBが正式パートナーとして参画
- 2026年以降本格展開予定

### 3.4 MCP（Model Context Protocol）との連携

**重要:** MCPとAP2は別プロトコル（補完的に機能）

```
[ユーザー指示]
      ↓
[Claude (MCP経由でコンテキスト取得)]
      ↓
[商品検索エンジン] ← MCP Tool
      ↓
[AP2プロトコルで決済]
      ↓
[PSP → マーチャント]
```

---

## 4. 商品データ仕様

### 4.1 統一データモデル（推奨）

```json
{
  "id": "prod_12345",
  "merchant_id": "merch_abc",
  "name": "商品名",
  "description": "商品説明（AIが理解可能な自然言語）",
  "price": {
    "amount": 1080,
    "currency": "JPY",
    "tax_included": true,
    "tax_rate": 0.10,
    "base_price": 982
  },
  "availability": {
    "status": "in_stock",
    "quantity": 100
  },
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "alt": "商品画像1"
    }
  ],
  "identifiers": {
    "sku": "SKU-001",
    "gtin13": "4901234567890"
  },
  "category": ["Electronics", "Smartphones"],
  "attributes": {
    "brand": "ブランド名",
    "color": "Black",
    "size": "M"
  },
  "shipping": {
    "weight_kg": 0.5,
    "free_shipping_threshold": 5000
  },
  "payment_constraints": {
    "supported_methods": ["credit_card", "konbini", "bank_transfer"],
    "psp_id": "splink"
  },
  "japan_specific": {
    "legal_restrictions": {
      "age_verification": false,
      "prescription_required": false
    },
    "delivery_options": {
      "same_day": false,
      "next_day": true
    }
  },
  "schema_org": {
    "@context": "https://schema.org/",
    "@type": "Product"
  }
}
```

### 4.2 Schema.org互換フォーマット

```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "商品名",
  "description": "商品説明",
  "image": "https://example.com/image.jpg",
  "brand": {
    "@type": "Brand",
    "name": "ブランド名"
  },
  "sku": "SKU-001",
  "gtin13": "4901234567890",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/product",
    "priceCurrency": "JPY",
    "price": "1080",
    "priceValidUntil": "2026-12-31",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "valueAddedTaxIncluded": true
    }
  }
}
```

### 4.3 Google Product Data Spec準拠

```xml
<item>
  <g:id>SKU-001</g:id>
  <g:title>商品名</g:title>
  <g:description>商品説明</g:description>
  <g:link>https://example.com/product</g:link>
  <g:image_link>https://example.com/image.jpg</g:image_link>
  <g:price>1080 JPY</g:price>
  <g:availability>in stock</g:availability>
  <g:condition>new</g:condition>
  <g:brand>ブランド名</g:brand>
  <g:gtin>4901234567890</g:gtin>
</item>
```

---

## 5. 同期アーキテクチャ

### 5.1 推奨: ハイブリッドパターン（Webhook + Polling）

```
┌──────────────┐   Webhook    ┌──────────────┐
│  EC Platform │ ──────────>  │   Webhook    │
│              │              │   Receiver   │
└──────────────┘              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │ Message Queue│
                              │ (SQS/Redis)  │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │ Sync Worker  │
                              └──────┬───────┘
                                     │
┌──────────────┐   Polling    ┌──────▼───────┐
│  EC Platform │ <──────────  │  Reconciler  │
│  (補完用)     │  (1時間毎)   │ (Webhook漏れ │
└──────────────┘              │  対策)       │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  Catalog DB  │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  AI Channel  │
                              │  Broadcast   │
                              └──────────────┘
```

**実装ポイント:**
- **Webhook**: リアルタイム更新の主チャネル
- **Polling**: 1時間毎の補完（Webhook漏れ対策）
- **冪等性**: Idempotency-Key必須
- **リトライ**: 指数バックオフ（最大3回）

### 5.2 リアルタイム在庫連携

```python
# 在庫予約パターン（Reserved Inventory）
class InventoryService:
    def reserve_inventory(self, sku, quantity, session_id, ttl=900):
        """在庫予約（15分間）"""
        with db.transaction():
            available = db.query(
                "SELECT available FROM inventory WHERE sku = ? FOR UPDATE",
                sku
            )
            if available < quantity:
                raise InsufficientInventoryError()

            db.execute(
                "INSERT INTO inventory_reservations "
                "(sku, quantity, session_id, expires_at) "
                "VALUES (?, ?, ?, ?)",
                sku, quantity, session_id, now() + ttl
            )
            db.execute(
                "UPDATE inventory SET available = available - ? WHERE sku = ?",
                quantity, sku
            )

    def commit_reservation(self, session_id):
        """購入確定"""
        db.execute(
            "UPDATE inventory_reservations SET status = 'committed' "
            "WHERE session_id = ?",
            session_id
        )

    def release_expired_reservations(self):
        """期限切れ予約の自動解放（定期実行）"""
        expired = db.query(
            "SELECT sku, quantity FROM inventory_reservations "
            "WHERE expires_at < ? AND status = 'pending'",
            now()
        )
        for reservation in expired:
            db.execute(
                "UPDATE inventory SET available = available + ? WHERE sku = ?",
                reservation['quantity'], reservation['sku']
            )
```

### 5.3 マルチチャネル配信（Pub/Sub）

```python
import asyncio
import aiohttp

AI_PLATFORMS = [
    {'name': 'ChatGPT', 'url': 'https://chatgpt.com/webhook', 'protocol': 'ACP'},
    {'name': 'Gemini', 'url': 'https://gemini.google.com/webhook', 'protocol': 'AP2'},
    {'name': 'Claude', 'url': 'https://claude.ai/webhook', 'protocol': 'MCP'},
]

async def broadcast_product_update(product_data):
    """全AIプラットフォームへ並列配信"""
    async with aiohttp.ClientSession() as session:
        tasks = [
            send_to_platform(session, platform, product_data)
            for platform in AI_PLATFORMS
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return dict(zip([p['name'] for p in AI_PLATFORMS], results))
```

---

## 6. 日本市場固有要件

### 6.1 税込価格表示（消費税法対応）

```python
class JapaneseProduct:
    def __init__(self, base_price: int, tax_rate: float = 0.10):
        self.base_price = base_price
        self.tax_rate = tax_rate  # 0.08（軽減税率）or 0.10（標準）

    @property
    def tax_included_price(self) -> int:
        """税込価格（表示義務あり）"""
        return int(self.base_price * (1 + self.tax_rate))

    @property
    def tax_amount(self) -> int:
        return self.tax_included_price - self.base_price
```

### 6.2 JANコード（GTIN-13）バリデーション

```python
def validate_jan_code(jan: str) -> bool:
    """JANコードチェックデジット検証"""
    if len(jan) != 13 or not jan.isdigit():
        return False

    odd_sum = sum(int(jan[i]) for i in range(0, 12, 2))
    even_sum = sum(int(jan[i]) for i in range(1, 12, 2))
    check_digit = (10 - ((odd_sum + even_sum * 3) % 10)) % 10

    return check_digit == int(jan[12])
```

### 6.3 決済方法（日本固有）

| 決済方法 | ACP対応 | AP2対応 | 備考 |
|---------|--------|--------|------|
| クレジットカード（JCB含む） | ◎ | ◎ | 両プロトコル対応 |
| コンビニ決済 | △ | ◎ | 非同期のためAP2が最適 |
| 銀行振込 | △ | ◎ | 非同期のためAP2が最適 |
| 代金引換 | △ | ○ | 配送時決済 |
| PayPay/LINE Pay | ○ | ○ | QRコード決済 |

### 6.4 配送区分

```python
SHIPPING_ZONES = {
    'hokkaido': {'name': '北海道', 'surcharge': 500},
    'tohoku': {'name': '東北', 'surcharge': 200},
    'kanto': {'name': '関東', 'surcharge': 0},
    'chubu': {'name': '中部', 'surcharge': 0},
    'kinki': {'name': '近畿', 'surcharge': 100},
    'chugoku': {'name': '中国', 'surcharge': 200},
    'shikoku': {'name': '四国', 'surcharge': 200},
    'kyushu': {'name': '九州', 'surcharge': 300},
    'okinawa': {'name': '沖縄', 'surcharge': 800}
}
```

---

## 7. 技術スタック推奨

### 7.1 バックエンド

| コンポーネント | 推奨技術 | 理由 |
|--------------|---------|------|
| 言語 | Python 3.11+ (FastAPI) | 高速開発、非同期サポート |
| DB | PostgreSQL 15+ | JSONB対応、パーティショニング |
| キャッシュ | Redis 7+ | 在庫キャッシュ、セッション管理 |
| キュー | AWS SQS/SNS | マネージド、スケーラブル |
| 検索 | Elasticsearch + Kuromoji | 日本語形態素解析 |

### 7.2 インフラ

```yaml
# AWS構成（推奨）
services:
  compute: ECS Fargate / Lambda
  database: RDS PostgreSQL (Multi-AZ)
  cache: ElastiCache Redis
  queue: SQS + SNS
  storage: S3 (商品画像)
  cdn: CloudFront
  monitoring: CloudWatch + X-Ray
```

### 7.3 セキュリティ

| 要件 | 実装 |
|------|------|
| 通信暗号化 | TLS 1.3以上 |
| 署名検証 | HMAC-SHA256（ACP）、RS256/ES256（AP2） |
| 認証 | OAuth 2.0 + JWT |
| IP制限 | OpenAI/Google IPアドレス許可リスト |
| コンプライアンス | PCI DSS Level 1準拠（AOC必須） |

---

## 8. 実装ロードマップ

### Phase 1: MVP（1-2ヶ月）

- [ ] 基本データモデル設計
- [ ] 1つのECプラットフォーム連携（Shopify推奨）
- [ ] 商品CRUD API
- [ ] Webhook受信機能
- [ ] 1つのAIチャネル配信（テスト用）

### Phase 2: ACP対応（2-3ヶ月）

- [ ] Delegated Payment API実装
- [ ] OpenAI署名検証
- [ ] 支払いトークン生成ロジック
- [ ] OpenAIとの統合テスト
- [ ] PCI DSS AOC取得

### Phase 3: Store Sync本格化（3-4ヶ月）

- [ ] 複数ECプラットフォーム対応
- [ ] ハイブリッド同期（Webhook + Polling）
- [ ] リアルタイム在庫連携
- [ ] 複数AIチャネル配信（ChatGPT、Gemini、Claude）
- [ ] 管理画面

### Phase 4: AP2対応（6ヶ月〜）

- [ ] AP2パートナー登録
- [ ] Google Merchant Center連携
- [ ] AP2 Payment Token実装
- [ ] カードネットワーク連携（JCB優先）
- [ ] 非同期決済フル対応

---

## 9. コスト試算

### 初年度（中規模: 10,000商品、100万API/月）

| 項目 | 月額（USD） | 年額（USD） |
|------|-----------|-----------|
| インフラ（AWS） | $370 | $4,440 |
| 開発人件費（3名） | - | $180,000 |
| PCI DSS監査 | - | $5,000 |
| その他（法務等） | - | $3,000 |
| **合計** | | **約$192,440** |

### ROI試算

| シナリオ | 年間収益 | ROI |
|---------|---------|-----|
| 市場シェア0.1% | 約6,800万円 | +254% |
| 市場シェア0.2% | 約1.36億円 | +607% |
| 市場シェア0.5% | 約3.4億円 | +1,667% |

---

## 10. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| OpenAI仕様変更 | 高 | バージョニング、アダプターパターン |
| 大量トラフィック | 高 | Auto Scaling、CDN活用 |
| セキュリティ侵害 | 極高 | 多層防御、常時監視、インシデント対応計画 |
| 在庫同期遅延 | 中 | 非同期処理、キューイング |
| 競合（PayPal等） | 中 | 日本市場特化、先行者利益 |

---

## 11. 次のステップ

### 即座に実施

1. OpenAIへのACP参加申請
2. PCI DSS準拠準備開始
3. PoC（概念実証）開発着手

### 確認が必要な事項（OpenAIへの問い合わせ）

1. ACP経由取引のレベニューシェア・手数料体系
2. 正確なAPIスキーマ仕様書
3. PSPが加盟店に請求できる手数料の制限

### 技術検証

1. Shopify連携のPoCシステム構築
2. パフォーマンステスト（1,000 req/sec目標）
3. セキュリティテスト

---

## 付録: 参考URL

- Google Merchant Center: https://support.google.com/merchants/
- Schema.org Product: https://schema.org/Product
- Shopify Admin API: https://shopify.dev/docs/api/admin-rest
- MCP (Model Context Protocol): https://modelcontextprotocol.io/
- PCI Security Standards: https://www.pcisecuritystandards.org/

---

**調査担当**: Claude Code
**レビュー待ち**: SPLink技術チーム
