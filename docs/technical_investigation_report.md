# ACP/AP2 技術調査レポート

**Issue #1: ACP Technical Investigation**
**調査日**: 2026年4月16日
**ステータス**: 完了

---

## エグゼクティブサマリー

エージェントコマース決済の2大プロトコル（ACP/AP2）について技術調査を実施した。調査の結果、以下が判明：

| プロトコル | ステータス | SPLink対応優先度 |
|-----------|----------|-----------------|
| **ACP** | ✅ 本番稼働中（ChatGPT） | **最優先** |
| **AP2** | 🔨 開発中（消費者向け未ローンチ） | 中長期準備 |

**結論**: ACPへの即時対応が必要。AP2は戦略的準備段階として参加表明を推奨。

---

## 1. ACP（Agentic Commerce Protocol）

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **主導者** | OpenAI + Stripe（共同開発・共同管理） |
| **ステータス** | ✅ **本番稼働中**（2025年9月リリース） |
| **ライセンス** | Apache 2.0（オープンソース） |
| **公式サイト** | https://www.agenticcommerce.dev/ |
| **GitHub** | https://github.com/agentic-commerce-protocol/agentic-commerce-protocol |

### 1.2 仕様バージョン履歴

| バージョン | リリース日 | 主な変更 |
|-----------|-----------|---------|
| 2025-09-29 | 2025/9/29 | 初回リリース |
| 2025-12-12 | 2025/12/12 | Fulfillment機能強化 |
| 2026-01-16 | 2026/1/16 | Capability negotiation追加 |
| 2026-01-30 | 2026/1/30 | Extensions, discounts, payment handlers |

### 1.3 技術仕様

#### 実装方式
- **RESTful API** または **MCP Server** として実装可能
- TLS 1.2以上必須

#### 主要コンポーネント

```
┌─────────────────┐
│   AI Agent      │ (ChatGPT等)
│   (Buyer側)     │
└────────┬────────┘
         │ 1. 購入リクエスト
         ▼
┌─────────────────┐
│  ACP Platform   │ (OpenAI)
│  - SPT発行      │
│  - 署名検証     │
└────────┬────────┘
         │ 2. Shared Payment Token (SPT)
         ▼
┌─────────────────┐
│   Merchant      │
│   (ACP Server)  │
│   - 商品情報提供│
│   - 注文処理    │
└────────┬────────┘
         │ 3. Delegated Payment
         ▼
┌─────────────────┐
│      PSP        │ (Stripe等)
│  - 決済処理     │
│  - トークン検証 │
└─────────────────┘
```

#### Shared Payment Token (SPT)
- Stripeが発行する一回限りの決済トークン
- 特定のマーチャント・カート合計に紐づく
- ユーザーの決済情報を露出させずに決済可能

#### Delegated Payment API
```
POST /agentic_commerce/delegate_payment
```
- HMAC-SHA256署名検証
- Idempotency-Key対応
- OpenAIのIPアドレス許可リスト設定

### 1.4 対応PSP

| PSP | ステータス | 備考 |
|-----|----------|------|
| **Stripe** | ✅ フル対応 | 共同開発者、SPT発行元 |
| **Adyen** | ⚠️ 部分対応 | ACP specに記載あり |
| その他 | 📝 Delegated Payment Spec | 実装が複雑 |

### 1.5 手数料体系

| 項目 | 料率 |
|------|------|
| OpenAI取引手数料 | **4%**（マーチャント負担） |
| Stripe決済手数料 | **約2.9% + $0.30** |
| **合計** | **約6.9% + $0.30**（$100注文で約$7.20） |

※ 初期費用・月額費用なし、取引ベース課金のみ

### 1.6 現在の採用状況

**既に稼働中のマーチャント**:
- Etsy（USセラー）
- Shopify（100万店以上対応予定）
  - Glossier, SKIMS, Spanx, Vuori
- URBN（Anthropologie, Free People, Urban Outfitters）
- Ashley Furniture, Coach, Kate Spade, Revolve, Halara等

**対応予定のAIプラットフォーム**:
- ChatGPT（稼働中）
- Microsoft Copilot（開発中）
- Anthropic（パートナー）
- Perplexity（開発中）

### 1.7 公式リソース

- [OpenAI Commerce Developers](https://developers.openai.com/commerce)
- [Delegated Payment Spec](https://developers.openai.com/commerce/specs/payment)
- [Stripe ACP Documentation](https://docs.stripe.com/agentic-commerce/protocol)
- [GitHub Repository](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)

---

## 2. AP2（Agent Payments Protocol）

### 2.1 概要

| 項目 | 内容 |
|------|------|
| **主導者** | Google Cloud |
| **ステータス** | 🔨 **開発中**（消費者向け未ローンチ） |
| **パートナー数** | 60社以上 |
| **GitHub** | https://github.com/google-agentic-commerce/AP2 |
| **公式ドキュメント** | https://ap2-protocol.org/ |

### 2.2 技術仕様

#### 設計思想
- **支払い方式非依存**（カード、暗号通貨、銀行振込等）
- **自律購買対応**（ユーザー不在での決済）
- **A2Aプロトコル/MCPの拡張**として機能

#### 核心技術: Verifiable Credentials (VCs)

```
┌─────────────────┐
│     User        │
└────────┬────────┘
         │ 1. Intent Mandate発行
         │    （暗号署名付き委任状）
         ▼
┌─────────────────┐
│   AI Agent      │
│   - 購買代行    │
│   - Mandate保持 │
└────────┬────────┘
         │ 2. Cart Mandate生成
         │    （最終承認・価格固定）
         ▼
┌─────────────────┐
│   Merchant      │
│   - Mandate検証 │
│   - 注文処理    │
└────────┬────────┘
         │ 3. 決済リクエスト
         ▼
┌─────────────────┐
│      PSP        │
│   - 署名検証    │
│   - 決済実行    │
└─────────────────┘
```

#### Mandateの種類

| 種類 | 説明 | 発行タイミング |
|------|------|---------------|
| **Intent Mandate** | ユーザーの購買意図を証明 | 「ランニングシューズ探して」時 |
| **Cart Mandate** | 最終承認・価格固定 | 購入確定時 |

### 2.3 パートナー企業

#### 決済ネットワーク
| 企業 | 役割・コメント |
|------|---------------|
| **JCB** | 「AP2は新しい決済時代を切り開く革新的なプロトコル」 |
| **Mastercard** | FIDO Alliance等と連携しverifiable credentials推進 |
| **Visa** | 参加表明 |
| **American Express** | パートナー |
| **UnionPay International** | パートナー |

#### PSP/フィンテック
- Adyen, PayPal, Coinbase, Revolut, Worldpay, Ant International

#### テック企業
- Salesforce, ServiceNow, Etsy, Intuit, Mysten Labs

### 2.4 暗号通貨対応: A2A x402

- GoogleとCoinbaseが共同開発
- ステーブルコインでの自律決済を実現
- ブロックチェーンベースの決済フロー

### 2.5 現在の状況

> **重要**: 2026年4月時点で、消費者が利用できるAP2ベースの決済サービスは**まだ存在しない**。
> プロトコルは開発者向けに公開されており、パートナー企業が開発を支援している段階。

### 2.6 日本市場との親和性

| 決済手段 | ACP適合性 | AP2適合性 | 理由 |
|----------|----------|----------|------|
| クレジットカード（即時） | ◎ | ○ | 両方対応 |
| コンビニ決済（非同期） | △ | ◎ | AP2の自律決済が適合 |
| 銀行振込（非同期） | △ | ◎ | Mandate方式が適合 |

---

## 3. 競合分析: GMO Payment Gateway

### 3.1 GMO-PGの動向

| 時期 | 施策 | 詳細 |
|------|------|------|
| 2025年6月 | **MCP対応発表** | 日本初のMCP対応PSP（fincode byGMO） |
| 2025年6月 | AI Agent連携 | Allganize「Agent Builder」との統合 |
| 2025年8月 | **MCP Server OSS公開** | GitHubでオープンソース化 |
| 2026年2月 | LLM対応ドキュメント | llms.txt形式で仕様書を最適化 |
| 2026年3月 | Visa Click to Pay | Visa決済機能実装 |

### 3.2 GMO-PGの規模

- **年間取引額**: 22兆円超
- **加盟店数**: 15万店以上
- **主要顧客**: NHK、国税庁等の公的機関含む

### 3.3 SPLinkへの示唆

GMO-PGは**MCP対応**を軸に差別化を図っている。SPLinkは：

1. **ACP対応**: ChatGPT市場への即時参入（GMO-PGより優位性を狙う）
2. **日本特有決済**: コンビニ・銀行振込でGMO-PGと同等以上
3. **Store Sync相当機能**: PayPal方式を参考に自社構築

---

## 4. PayPal Store Sync分析

### 4.1 機能概要

2025年10月にPayPalがリリースしたエージェントコマース対応機能。

| 機能 | 説明 |
|------|------|
| **Store Sync** | 商品カタログをAIプラットフォームに自動連携 |
| **Agent Ready** | AI経由の決済を即座に受付可能（2026年初頭ロールアウト） |

### 4.2 Store Syncの仕組み

```
┌─────────────────┐     ┌─────────────────┐
│   Merchant      │     │   AI Platform   │
│   - 商品DB      │────▶│   - ChatGPT     │
│   - 在庫情報    │     │   - Copilot     │
│   - フルフィル  │     │   - Perplexity  │
└─────────────────┘     └─────────────────┘
         │
         │ PayPal Store Sync
         │ （自動同期）
         ▼
┌─────────────────┐
│   PayPal Hub    │
│   - カタログ管理│
│   - 決済処理    │
│   - 不正検知    │
└─────────────────┘
```

### 4.3 パートナー連携

- Wix, Cymbio, BigCommerce, Feedonomics, Shopware

### 4.4 SPLinkへの示唆

**PayPalのStore Syncを参考に、SPLink独自の「Store Sync」を構築すべき**

メリット：
1. 技術力のない加盟店でもAI市場に参入可能
2. 複数AIプラットフォームへの一括連携
3. 日本市場のハブ化

---

## 5. 技術実装要件

### 5.1 ACP対応に必要な実装

#### 必須要件

| カテゴリ | 要件 | 詳細 |
|----------|------|------|
| **セキュリティ** | PCI DSS準拠 | AOC（準拠証明書）の提出必須 |
| | TLS 1.2以上 | 全エンドポイント |
| | HMAC-SHA256署名検証 | OpenAI署名の検証 |
| **API** | Delegated Payment API | `POST /agentic_commerce/delegate_payment` |
| | Idempotency対応 | 冪等性キーの処理 |
| | Webhook | ORDER_UPDATE通知 |
| **トークン** | 支払いトークン生成 | 最大請求額、有効期限、対象マーチャント |

#### 実装オプション

| オプション | 説明 | 推奨度 |
|-----------|------|--------|
| Stripe SPT統合 | Stripeと連携してSPTを使用 | ★★★ 最も簡単 |
| 独自Delegated Payment | 完全な独自実装 | ★★ 複雑だが独立性高い |
| MCP Server実装 | MCPプロトコル対応 | ★★ GMO-PG方式 |

### 5.2 AP2対応に必要な実装（将来）

| カテゴリ | 要件 |
|----------|------|
| **暗号署名** | Verifiable Credentials対応 |
| **Mandate処理** | Intent/Cart Mandate検証 |
| **A2A連携** | Agent2Agentプロトコル対応 |
| **MCP連携** | Model Context Protocol対応 |

---

## 6. 推奨アクション

### 6.1 即時実施（Phase 1: 0-3ヶ月）

| アクション | 担当 | 優先度 |
|-----------|------|--------|
| OpenAIへのPSP参加申請 | 経営/事業開発 | **最優先** |
| PCI DSS AOC準備 | セキュリティ | **最優先** |
| ACP仕様の詳細調査 | エンジニアリング | 高 |
| 技術チーム組成 | 人事/エンジニアリング | 高 |

### 6.2 短期実施（Phase 2: 3-6ヶ月）

| アクション | 担当 | 優先度 |
|-----------|------|--------|
| Delegated Payment API実装 | エンジニアリング | **最優先** |
| 支払いトークン生成ロジック | エンジニアリング | 高 |
| OpenAIとの統合テスト | エンジニアリング | 高 |
| Stripeとの連携検討 | 事業開発 | 中 |

### 6.3 中期実施（Phase 3: 6-12ヶ月）

| アクション | 担当 | 優先度 |
|-----------|------|--------|
| Store Sync機能構築 | エンジニアリング | 高 |
| 加盟店向けAPI/SDK提供 | エンジニアリング | 高 |
| ChatGPT本番接続 | エンジニアリング | **最優先** |
| AP2パートナー登録 | 事業開発 | 中 |

### 6.4 長期準備（Phase 4: 12ヶ月以降）

| アクション | 担当 | 優先度 |
|-----------|------|--------|
| AP2本格対応 | エンジニアリング | 中 |
| 複数AIプラットフォーム連携 | エンジニアリング/事業開発 | 中 |
| 暗号通貨決済対応 | エンジニアリング | 低 |

---

## 7. リスクと対策

### 7.1 主要リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| OpenAI参加承認の遅延 | 高 | 早期申請、ロビー活動強化 |
| Stripe独占リスク | 中 | 独自Delegated Payment実装検討 |
| GMO-PGの先行 | 中 | 差別化ポイント（日本決済）を強化 |
| AP2の急速な普及 | 低 | パートナー登録で情報収集継続 |

### 7.2 競合優位性の維持

SPLinkの強み:
1. **日本特有決済手段の完全対応**（コンビニ、銀行振込、JCB）
2. **数万店舗の既存加盟店基盤**
3. **日本市場への深い理解**

---

## 8. 参考リソース

### ACP関連
- [Buy it in ChatGPT: Instant Checkout and ACP](https://openai.com/index/buy-it-in-chatgpt/)
- [Stripe: Developing an open standard for agentic commerce](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce)
- [OpenAI Commerce Developers](https://developers.openai.com/commerce)
- [Stripe ACP Documentation](https://docs.stripe.com/agentic-commerce/protocol)
- [ACP GitHub Repository](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)

### AP2関連
- [Google: Announcing Agent Payments Protocol (AP2)](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- [AP2 Protocol Documentation](https://ap2-protocol.org/)
- [AP2 GitHub Repository](https://github.com/google-agentic-commerce/AP2)
- [VentureBeat: Google's AP2 allows AI agents to complete purchases](https://venturebeat.com/ai/googles-new-agent-payments-protocol-ap2-allows-ai-agents-to-complete)

### GMO-PG関連
- [GMO-PG: MCP対応発表](https://www.gmo-pg.com/en/news/press/gmo-paymentgateway/2025/0619.html)
- [GMO-PG: MCP Server OSS公開](https://www.gmo-pg.com/en/news/press/gmo_payment_gateway_gmo_epsilon/2025/0804.html)

### PayPal関連
- [PayPal: Agentic Commerce Services発表](https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping)
- [PayPal Agentic Commerce](https://www.paypal.com/us/business/ai)

---

**作成者**: Claude Code
**最終更新**: 2026年4月16日
