# Issue 4: Store Sync 実装計画

**作成日**: 2026年4月16日
**ブランチ**: `feature/issue-4-store-sync-implementation`
**前提**: Issue #3 技術調査完了

---

## 1. 技術スタック決定

Issue #3の調査結果に基づき、以下の技術スタックを採用する。

### 1.1 バックエンド

| コンポーネント | 技術 | バージョン | 選定理由 |
|--------------|------|----------|---------|
| **言語** | Python | 3.12+ | 高速開発、非同期サポート、AIエコシステム親和性 |
| **フレームワーク** | FastAPI | 0.110+ | 高性能、自動OpenAPI生成、型安全 |
| **ORM** | SQLAlchemy | 2.0+ | 非同期対応、成熟したエコシステム |
| **バリデーション** | Pydantic | 2.0+ | FastAPI統合、高速 |
| **タスクキュー** | Celery + Redis | 5.3+ | 非同期処理、スケジュール実行 |

### 1.2 データベース

| コンポーネント | 技術 | 選定理由 |
|--------------|------|---------|
| **メインDB** | PostgreSQL 16 | JSONB対応、信頼性、パフォーマンス |
| **キャッシュ** | Redis 7 | 在庫キャッシュ、セッション、キュー |
| **検索** | PostgreSQL Full-Text + pg_bigm | 日本語全文検索（初期はElasticsearch不要） |

### 1.3 インフラ（初期）

| コンポーネント | 技術 | 選定理由 |
|--------------|------|---------|
| **コンテナ** | Docker + Docker Compose | ローカル開発、本番移行容易 |
| **CI/CD** | GitHub Actions | GitHub統合、無料枠 |
| **本番（将来）** | AWS ECS Fargate | スケーラブル、マネージド |

---

## 2. プロジェクト構成

```
store-sync/
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
├── alembic.ini
├── README.md
│
├── src/
│   ├── __init__.py
│   ├── main.py                    # FastAPIエントリーポイント
│   ├── config.py                  # 設定管理
│   │
│   ├── api/                       # APIエンドポイント
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── products.py        # 商品API
│   │   │   ├── merchants.py       # 加盟店API
│   │   │   ├── inventory.py       # 在庫API
│   │   │   └── webhooks.py        # Webhook受信
│   │   └── acp/
│   │       ├── __init__.py
│   │       ├── delegate_payment.py # ACP決済API
│   │       └── products.py         # ACP商品API
│   │
│   ├── models/                    # SQLAlchemyモデル
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── merchant.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   ├── order.py
│   │   └── payment_token.py
│   │
│   ├── schemas/                   # Pydanticスキーマ
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── merchant.py
│   │   ├── inventory.py
│   │   └── acp.py
│   │
│   ├── services/                  # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── product_service.py
│   │   ├── inventory_service.py
│   │   ├── sync_service.py
│   │   └── payment_service.py
│   │
│   ├── adapters/                  # 外部連携
│   │   ├── __init__.py
│   │   ├── openai_adapter.py      # OpenAI/ACP連携
│   │   ├── shopify_adapter.py     # Shopify連携
│   │   └── base_adapter.py
│   │
│   ├── workers/                   # 非同期ワーカー
│   │   ├── __init__.py
│   │   ├── sync_worker.py
│   │   └── broadcast_worker.py
│   │
│   └── utils/                     # ユーティリティ
│       ├── __init__.py
│       ├── signature.py           # HMAC署名検証
│       ├── jan_code.py            # JANコード検証
│       └── tax.py                 # 税計算
│
├── migrations/                    # Alembicマイグレーション
│   └── versions/
│
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_api/
    ├── test_services/
    └── test_utils/
```

---

## 3. データベース設計

### 3.1 ER図

```
┌─────────────────┐       ┌─────────────────┐
│    merchants    │       │    products     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ name            │  │    │ merchant_id (FK)│──┐
│ api_key_hash    │  │    │ sku             │  │
│ webhook_url     │  │    │ name            │  │
│ status          │  │    │ description     │  │
│ created_at      │  │    │ price_amount    │  │
│ updated_at      │  │    │ price_currency  │  │
└─────────────────┘  │    │ tax_rate        │  │
                     │    │ gtin13          │  │
                     │    │ category        │  │
                     │    │ attributes (JSON)│  │
                     │    │ images (JSON)   │  │
                     │    │ status          │  │
                     │    │ created_at      │  │
                     │    │ updated_at      │  │
                     │    └─────────────────┘  │
                     │                          │
                     │    ┌─────────────────┐  │
                     │    │   inventory     │  │
                     │    ├─────────────────┤  │
                     │    │ id (PK)         │  │
                     └────│ product_id (FK) │──┘
                          │ quantity        │
                          │ reserved        │
                          │ available       │
                          │ updated_at      │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│ payment_tokens  │       │     orders      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ token           │       │ merchant_id (FK)│
│ merchant_id (FK)│       │ external_id     │
│ max_amount      │       │ status          │
│ currency        │       │ total_amount    │
│ expires_at      │       │ items (JSON)    │
│ used            │       │ created_at      │
│ created_at      │       │ updated_at      │
└─────────────────┘       └─────────────────┘

┌─────────────────┐
│ inventory_      │
│ reservations    │
├─────────────────┤
│ id (PK)         │
│ product_id (FK) │
│ quantity        │
│ session_id      │
│ status          │
│ expires_at      │
│ created_at      │
└─────────────────┘
```

### 3.2 テーブル定義

#### merchants（加盟店）

```sql
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_merchants_status ON merchants(status);
```

#### products（商品）

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price_amount INTEGER NOT NULL,
    price_currency CHAR(3) DEFAULT 'JPY',
    tax_rate DECIMAL(4,2) DEFAULT 0.10,
    gtin13 CHAR(13),
    category VARCHAR(255)[],
    attributes JSONB DEFAULT '{}',
    images JSONB DEFAULT '[]',
    shipping JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(merchant_id, sku)
);

CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_gtin13 ON products(gtin13);
CREATE INDEX idx_products_category ON products USING GIN(category);
CREATE INDEX idx_products_name_search ON products USING GIN(to_tsvector('japanese', name));
```

#### inventory（在庫）

```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    available INTEGER GENERATED ALWAYS AS (quantity - reserved) STORED,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(product_id)
);

CREATE INDEX idx_inventory_available ON inventory(available);
```

#### inventory_reservations（在庫予約）

```sql
CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_reservations_session ON inventory_reservations(session_id),
    INDEX idx_reservations_expires ON inventory_reservations(expires_at, status)
);
```

#### payment_tokens（決済トークン）

```sql
CREATE TABLE payment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(100) NOT NULL UNIQUE,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    user_id VARCHAR(255) NOT NULL,
    max_amount INTEGER NOT NULL,
    currency CHAR(3) DEFAULT 'JPY',
    constraints JSONB DEFAULT '{}',
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tokens_token ON payment_tokens(token);
CREATE INDEX idx_tokens_expires ON payment_tokens(expires_at, used);
```

---

## 4. API設計

### 4.1 商品API（内部・加盟店向け）

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/v1/products` | 商品一覧取得 |
| GET | `/api/v1/products/{id}` | 商品詳細取得 |
| POST | `/api/v1/products` | 商品登録 |
| PUT | `/api/v1/products/{id}` | 商品更新 |
| DELETE | `/api/v1/products/{id}` | 商品削除 |
| POST | `/api/v1/products/bulk` | 一括登録（CSV） |

### 4.2 在庫API

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/v1/inventory/{product_id}` | 在庫確認 |
| PUT | `/api/v1/inventory/{product_id}` | 在庫更新 |
| POST | `/api/v1/inventory/{product_id}/reserve` | 在庫予約 |
| DELETE | `/api/v1/inventory/reservations/{id}` | 予約解放 |

### 4.3 ACP API（OpenAI向け）

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/acp/delegate_payment` | 決済トークン生成 |
| GET | `/acp/products` | 商品カタログ取得 |
| GET | `/acp/products/{id}` | 商品詳細取得 |
| GET | `/acp/products/{id}/availability` | 在庫確認 |

### 4.4 Webhook

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/webhooks/shopify` | Shopify Webhook受信 |
| POST | `/webhooks/openai` | OpenAI Webhook受信 |

---

## 5. 実装フェーズ詳細

### Phase 1: MVP基盤（2週間）

#### Week 1: プロジェクトセットアップ

- [ ] **Step 1.1**: プロジェクト初期化
  - pyproject.toml作成（Poetry）
  - Docker/Docker Compose設定
  - GitHub Actions CI設定

- [ ] **Step 1.2**: データベース構築
  - PostgreSQL + Redis Docker設定
  - SQLAlchemyモデル実装
  - Alembicマイグレーション作成

- [ ] **Step 1.3**: 基本API実装
  - FastAPIアプリケーション構造
  - 商品CRUD API
  - 在庫API

#### Week 2: コア機能

- [ ] **Step 1.4**: ビジネスロジック実装
  - 商品サービス
  - 在庫サービス（予約機能含む）
  - 税計算ユーティリティ

- [ ] **Step 1.5**: テスト・ドキュメント
  - ユニットテスト
  - API統合テスト
  - OpenAPI仕様書生成

### Phase 2: 加盟店連携（2週間）

#### Week 3: 加盟店管理

- [ ] **Step 2.1**: 加盟店API
  - 加盟店登録・認証
  - APIキー管理
  - Webhook URL設定

- [ ] **Step 2.2**: バルクインポート
  - CSVパーサー実装
  - バリデーション（JANコード等）
  - 非同期処理（Celery）

#### Week 4: Webhook連携

- [ ] **Step 2.3**: Shopify連携
  - Shopify Webhook受信
  - 商品同期ロジック
  - 在庫同期ロジック

- [ ] **Step 2.4**: 同期エンジン
  - Webhook + Polling ハイブリッド
  - 変更検知
  - リトライ機構

### Phase 3: ACP連携（2週間）

#### Week 5: ACP API実装

- [ ] **Step 3.1**: Delegated Payment API
  - トークン生成ロジック
  - 制約（金額、有効期限）管理
  - HMAC署名検証

- [ ] **Step 3.2**: 商品カタログAPI
  - Schema.org形式変換
  - フィルタリング・ページネーション
  - キャッシュ戦略

#### Week 6: OpenAI統合

- [ ] **Step 3.3**: OpenAI Webhook
  - 注文通知受信
  - ステータス更新
  - 加盟店への通知

- [ ] **Step 3.4**: 統合テスト
  - OpenAIサンドボックス連携
  - E2Eテスト
  - パフォーマンステスト

### Phase 4: 運用機能（1週間）

#### Week 7: モニタリング・管理

- [ ] **Step 4.1**: ログ・モニタリング
  - 構造化ログ（structlog）
  - メトリクス（Prometheus形式）
  - エラーアラート

- [ ] **Step 4.2**: 管理機能
  - 管理者API
  - 同期ステータス確認
  - 手動再同期機能

---

## 6. 成功基準

### Phase 1完了時

- [ ] 商品CRUD APIが動作する
- [ ] 在庫予約・解放が正常に機能する
- [ ] 単体テストカバレッジ80%以上

### Phase 2完了時

- [ ] Shopify連携で商品が自動同期される
- [ ] CSVバルクインポートが動作する
- [ ] Webhook漏れ時のPolling補完が機能する

### Phase 3完了時

- [ ] ACP Delegated Payment APIが仕様準拠
- [ ] OpenAIサンドボックスで決済フローが完了する
- [ ] 1,000 req/sec のパフォーマンス達成

### Phase 4完了時

- [ ] 本番デプロイ可能な状態
- [ ] 監視・アラートが設定済み
- [ ] 運用ドキュメント完備

---

## 7. リスク・課題

| リスク | 影響 | 対策 |
|--------|------|------|
| OpenAI ACP仕様変更 | 高 | アダプターパターンで疎結合化 |
| PCI DSS未取得 | 高 | 決済処理は既存SPLink基盤に委譲 |
| パフォーマンス不足 | 中 | 早期の負荷テスト、キャッシュ戦略 |
| Shopify API制限 | 中 | バッチ処理、レート制限対応 |

---

## 8. 依存関係

- **Issue #2 (ACP実装)**: Phase 3でACP連携時に参照
- **Issue #3 (技術調査)**: 本計画の基盤（完了済み）
- **SPLink既存基盤**: 決済処理委譲

---

## 9. スケジュール概要

```
Week 1-2: Phase 1 (MVP基盤)
Week 3-4: Phase 2 (加盟店連携)
Week 5-6: Phase 3 (ACP連携)
Week 7:   Phase 4 (運用機能)
-----------------------------------
合計: 7週間（約2ヶ月）
```

---

**計画策定**: Claude Code
**承認待ち**: SPLink技術チーム
