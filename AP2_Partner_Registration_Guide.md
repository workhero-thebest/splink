# AP2パートナー登録ガイド

**Issue #6: AP2 Partner Registration**
**作成日**: 2026-04-16
**ステータス**: 登録準備完了

---

## 1. 概要

本ドキュメントは、SPLinkがAP2（Agent Payments Protocol）パートナープログラムに参加するための手順と準備事項をまとめたものです。

### パートナーフォーム情報

| 項目 | 内容 |
|------|------|
| **フォーム名** | Agent Payments Protocol (AP2) interest form |
| **URL** | https://goo.gle/ap2-partner-form |
| **審査方式** | 個別審査（case by case basis） |
| **連絡方法** | 審査通過後、Googleチームより連絡 |

---

## 2. 登録に必要な情報

### 2.1 必須項目

| フィールド | 入力内容（SPLink用） | 備考 |
|-----------|---------------------|------|
| **メールアドレス** | 担当者のメールアドレス | 連絡用 |
| **氏名** | 担当者氏名 | |
| **職務** | 例: Head of Engineering | |
| **企業/組織名** | SPLink | |
| **ウェブサイトURL** | SPLink公式サイトURL | |
| **業界セクター** | Payment Service Provider | 選択式 |
| **ユースケース説明** | 下記テンプレート参照 | 重要 |
| **パートナーシップの理由と貢献内容** | 下記テンプレート参照 | 重要 |
| **公開掲載への同意** | Yes/No | |
| **プライバシーポリシー同意** | 必須 | |

### 2.2 任意項目

| フィールド | 入力内容 | 備考 |
|-----------|---------|------|
| **AP2関連コンテンツリンク** | 技術ブログ等があれば | |
| **必要なサポート** | 複数選択可 | |
| **Google従業員連絡先** | 既知の連絡先があれば | |

---

## 3. 入力テンプレート

### 3.1 ユースケース説明（Use Case Description）

```
SPLink is a leading Payment Service Provider (PSP) in Japan, serving
tens of thousands of merchants with comprehensive payment solutions.

Our primary use case for AP2 integration:

1. **Japanese Payment Methods Integration**
   - Convenience store payments (Konbini)
   - Bank transfers
   - JCB credit cards
   - Carrier billing

2. **Asynchronous Payment Support**
   - Native support for non-instant payment methods
   - Status management and webhook notifications
   - Timeout handling for extended payment windows

3. **Merchant Ecosystem**
   - Enable our existing merchant network to participate in
     agent commerce without additional development
   - Provide turnkey AP2 integration via our platform

4. **Store Sync Functionality**
   - Centralized product catalog management
   - Multi-AI platform distribution (ChatGPT, Google, etc.)
```

### 3.2 パートナーシップの理由と貢献内容

```
Why SPLink wants to partner with AP2:

1. **Strategic Alignment**
   - AP2's asynchronous payment model aligns perfectly with
     Japanese payment culture (convenience store, bank transfer)
   - We see AP2 as critical infrastructure for agent commerce in Japan

2. **Market Position**
   - SPLink has extensive experience in Japanese payment regulations
   - Deep understanding of local merchant needs and compliance requirements

3. **Contribution to AP2 Ecosystem**
   - Provide feedback on Japan-specific payment requirements
   - Contribute to specification development for asynchronous payments
   - Share insights on non-card payment method integration
   - Participate in discussions and pull requests on GitHub

4. **Technical Capabilities**
   - PCI DSS compliant infrastructure
   - Existing webhook and API systems
   - Experience with multiple payment protocols
```

---

## 4. 必要なサポート選択肢

フォームで選択可能なサポート項目：

| サポート項目 | 推奨 | 理由 |
|-------------|------|------|
| Technical documentation | ✅ | 実装に必須 |
| Implementation guidance | ✅ | 日本市場特有の要件を相談 |
| Partner program access | ✅ | 正式パートナーとして参加 |
| Marketing collaboration | △ | 優先度低 |
| Other | - | 必要に応じて |

---

## 5. 登録手順

```
Step 1: 準備
├── 本ドキュメントの内容を確認
├── 担当者を決定
└── 入力内容を事前準備

Step 2: フォーム入力
├── https://goo.gle/ap2-partner-form にアクセス
├── 必須項目を入力
├── ユースケース説明を入力（テンプレート参照）
└── パートナーシップ理由を入力（テンプレート参照）

Step 3: 送信
├── プライバシーポリシーに同意
└── フォームを送信

Step 4: フォローアップ
├── 確認メールを保存
├── Googleチームからの連絡を待つ
└── 追加情報の要請に対応
```

---

## 6. 審査通過後のアクション

### 6.1 期待される情報提供

| 情報 | 内容 |
|------|------|
| 技術仕様書 | AP2の詳細な技術ドキュメント |
| APIドキュメント | エンドポイント、認証方式等 |
| GitHubアクセス | プライベートリポジトリへのアクセス |
| コミュニティ招待 | Slack/Discordへの招待 |

### 6.2 SPLink側の準備事項

```
審査通過後に必要な準備:

1. 技術チームのアサイン
   └── AP2実装担当者の選定

2. 開発環境の準備
   └── MCP SDKのセットアップ
   └── テスト環境の構築

3. セキュリティ確認
   └── PCI DSS準拠状況の確認
   └── 暗号署名実装の検討

4. プロジェクト計画
   └── 実装ロードマップの策定
   └── マイルストーンの設定
```

---

## 7. 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [SPLink_ACP_AP2_提案書.md](./SPLink_ACP_AP2_提案書.md) | 全体戦略と提案 |
| [AP2_Technical_Investigation.md](./AP2_Technical_Investigation.md) | 技術調査レポート |

---

## 8. チェックリスト

### 登録前

- [ ] 担当者の決定
- [ ] メールアドレスの確認
- [ ] ユースケース説明の準備
- [ ] パートナーシップ理由の準備
- [ ] 社内承認の取得

### 登録時

- [ ] フォーム入力完了
- [ ] プライバシーポリシー同意
- [ ] 送信確認

### 登録後

- [ ] 確認メールの保存
- [ ] 社内共有
- [ ] フォローアップ対応準備

---

## 9. 連絡先・参考リンク

| リソース | URL |
|----------|-----|
| AP2パートナーフォーム | https://goo.gle/ap2-partner-form |
| MCP公式サイト | https://modelcontextprotocol.io |
| MCP GitHub | https://github.com/modelcontextprotocol |

---

*本ガイドは2026年4月16日時点の情報に基づいています。フォーム内容は変更される可能性があるため、登録時に最新情報を確認してください。*
