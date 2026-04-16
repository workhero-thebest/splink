/**
 * ACP (Agentic Commerce Protocol) 型定義
 * @see https://developers.openai.com/commerce/specs/payment
 */

/** 支払いトークンの制約 */
export interface PaymentTokenConstraints {
  /** 最大請求可能額 */
  maxAmount: number;
  /** 通貨コード (ISO 4217) */
  currency: string;
  /** 有効期限 (ISO 8601) */
  validUntil: string;
  /** 対象マーチャントID */
  merchantId: string;
  /** 許可された決済手段 */
  allowedPaymentMethods?: string[];
}

/** 支払いトークン */
export interface PaymentToken {
  /** トークンID (spt_xxxx形式) */
  tokenId: string;
  /** トークン制約 */
  constraints: PaymentTokenConstraints;
  /** 作成日時 */
  createdAt: string;
  /** 使用済みフラグ */
  used: boolean;
}

/** カートアイテム */
export interface CartItem {
  /** 商品ID */
  productId: string;
  /** 商品名 */
  name: string;
  /** 数量 */
  quantity: number;
  /** 単価 */
  unitPrice: number;
  /** 通貨コード */
  currency: string;
}

/** 配送情報 */
export interface ShippingInfo {
  /** 配送先名 */
  name: string;
  /** 郵便番号 */
  postalCode: string;
  /** 都道府県 */
  prefecture: string;
  /** 市区町村 */
  city: string;
  /** 番地 */
  address1: string;
  /** 建物名等 */
  address2?: string;
  /** 電話番号 */
  phone?: string;
}

/** カート詳細 */
export interface CartDetails {
  /** カートアイテム */
  items: CartItem[];
  /** 配送情報 */
  shipping?: ShippingInfo;
  /** 小計 */
  subtotal: number;
  /** 配送料 */
  shippingFee?: number;
  /** 税額 */
  tax?: number;
  /** 合計 */
  total: number;
}

/** Delegated Payment リクエスト */
export interface DelegatedPaymentRequest {
  /** 支払いトークンID */
  paymentToken: string;
  /** マーチャントID */
  merchantId: string;
  /** 請求額 */
  amount: number;
  /** 通貨コード */
  currency: string;
  /** カート詳細 */
  cartDetails: CartDetails;
}

/** 決済ステータス */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

/** Delegated Payment レスポンス */
export interface DelegatedPaymentResponse {
  /** 決済ID */
  paymentId: string;
  /** ステータス */
  status: PaymentStatus;
  /** 請求額 */
  amountCharged: number;
  /** 通貨コード */
  currency: string;
  /** マーチャント注文ID */
  merchantOrderId: string;
  /** 処理日時 */
  processedAt: string;
}

/** エラーコード */
export type ACPErrorCode =
  | 'invalid_token'
  | 'token_expired'
  | 'token_already_used'
  | 'amount_exceeded'
  | 'merchant_mismatch'
  | 'invalid_signature'
  | 'invalid_request'
  | 'payment_failed'
  | 'internal_error';

/** ACP エラーレスポンス */
export interface ACPError {
  code: ACPErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** ORDER_UPDATE Webhook イベントタイプ */
export type OrderEventType =
  | 'order.created'
  | 'order.confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  | 'order.refunded';

/** ORDER_UPDATE Webhook ペイロード */
export interface OrderUpdatePayload {
  /** イベントタイプ */
  event: OrderEventType;
  /** 注文ID */
  orderId: string;
  /** マーチャントID */
  merchantId: string;
  /** イベント発生日時 */
  timestamp: string;
  /** イベント固有データ */
  data: Record<string, unknown>;
}
