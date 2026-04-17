# SPLink MCP Server PoC

AIエージェント向け決済サーバーのProof of Concept実装です。

## 概要

このMCPサーバーは、SPLinkがAP2（Agent Payments Protocol）対応を進めるための技術検証用プロトタイプです。

### 特徴

- **MCP準拠**: Model Context Protocolに完全準拠
- **日本市場対応**: コンビニ決済・銀行振込などの非同期決済をサポート
- **AIエージェント連携**: Claude, ChatGPT等のAIアシスタントから利用可能

## 実装ツール一覧

| ツール名 | 説明 |
|---------|------|
| `search_products` | 商品検索（キーワード検索対応） |
| `get_product` | 商品詳細取得 |
| `create_payment` | 決済作成（同期/非同期対応） |
| `check_payment_status` | 決済状態確認 |
| `list_payments` | 決済履歴一覧 |
| `simulate_payment_completion` | [テスト用] 入金シミュレート |

## 対応決済方法

| 方法 | タイプ | 説明 |
|------|--------|------|
| `credit_card` | 同期 | クレジットカード（即時完了） |
| `konbini` | 非同期 | コンビニ決済（72時間有効） |
| `bank_transfer` | 非同期 | 銀行振込（7日間有効） |

## セットアップ

```bash
cd mcp-server-poc

# 依存関係のインストール
npm install

# ビルド
npm run build

# 開発モードで実行
npm run dev
```

## Claude Desktopでの使用

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加：

```json
{
  "mcpServers": {
    "splink-payment": {
      "command": "node",
      "args": ["/path/to/mcp-server-poc/dist/index.js"]
    }
  }
}
```

## 使用例

### 1. 商品検索

```
AIに: 「コーヒーを探して」
→ search_products(query: "コーヒー") が呼ばれる
```

### 2. コンビニ決済で購入

```
AIに: 「prod_001をコンビニ決済で購入したい」
→ create_payment(productId: "prod_001", paymentMethod: "konbini", ...)
→ 支払いコードと期限が返される
```

### 3. 決済状態確認

```
AIに: 「pay_000001の状態を確認して」
→ check_payment_status(paymentId: "pay_000001")
→ 現在のステータスが返される
```

## アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│   MCP Server    │────▶│  Payment API    │
│ (Claude/GPT)    │     │   (this PoC)    │     │  (mock/real)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │    stdio transport    │
        └───────────────────────┘
```

## 非同期決済フロー

```
1. create_payment (konbini)
   └─▶ status: "pending"
       └─▶ 支払いコード発行

2. [ユーザーがコンビニで支払い]

3. check_payment_status
   └─▶ status: "completed" (入金確認後)
```

## 今後の拡張

- [ ] 実際の決済APIとの連携
- [ ] Webhook通知の実装
- [ ] 認証・認可の追加
- [ ] エラーハンドリングの強化
- [ ] ロギング・監視の追加

## 関連ドキュメント

- [AP2技術調査レポート](../AP2_Technical_Investigation.md)
- [AP2パートナー登録ガイド](../AP2_Partner_Registration_Guide.md)
- [MCP公式ドキュメント](https://modelcontextprotocol.io)
