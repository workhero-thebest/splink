import { v4 as uuidv4 } from 'uuid';
import type {
  DelegatedPaymentRequest,
  DelegatedPaymentResponse,
  PaymentStatus,
  ACPError,
} from '../types/index.js';
import { tokenService } from './token.service.js';
import { idempotencyService } from './idempotency.service.js';

/** 決済処理結果 */
export type PaymentResult =
  | { success: true; response: DelegatedPaymentResponse }
  | { success: false; error: ACPError };

/**
 * 決済処理サービス
 *
 * ACPの Delegated Payment フローを処理する
 */
export class PaymentService {
  /**
   * Delegated Payment を処理
   */
  async processDelegatedPayment(
    request: DelegatedPaymentRequest,
    idempotencyKey?: string
  ): Promise<PaymentResult> {
    // 冪等性チェック
    if (idempotencyKey) {
      const cached = idempotencyService.get(idempotencyKey);
      if (cached) {
        return { success: true, response: cached };
      }
    }

    // トークン検証
    const tokenValidation = tokenService.validateToken(
      request.paymentToken,
      request.merchantId,
      request.amount,
      request.currency
    );

    if (!tokenValidation.valid) {
      return {
        success: false,
        error: tokenValidation.error!,
      };
    }

    // カート合計と請求額の整合性チェック
    if (request.cartDetails.total !== request.amount) {
      return {
        success: false,
        error: {
          code: 'invalid_request',
          message: `Cart total (${request.cartDetails.total}) does not match amount (${request.amount})`,
        },
      };
    }

    try {
      // 実際の決済処理を実行
      // TODO: 既存の決済システムと連携
      const paymentResult = await this.executePayment(request);

      // トークンを使用済みにマーク
      tokenService.markAsUsed(request.paymentToken);

      const response: DelegatedPaymentResponse = {
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
        amountCharged: request.amount,
        currency: request.currency,
        merchantOrderId: paymentResult.merchantOrderId,
        processedAt: new Date().toISOString(),
      };

      // 冪等性キャッシュに保存
      if (idempotencyKey) {
        idempotencyService.set(idempotencyKey, response);
      }

      return { success: true, response };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'payment_failed',
          message: error instanceof Error ? error.message : 'Payment processing failed',
        },
      };
    }
  }

  /**
   * 実際の決済処理を実行
   *
   * TODO: 既存の決済システム（クレジットカード、コンビニ等）と連携
   */
  private async executePayment(
    request: DelegatedPaymentRequest
  ): Promise<{ paymentId: string; status: PaymentStatus; merchantOrderId: string }> {
    // 決済処理のシミュレーション
    // 実際の実装では既存の決済ゲートウェイAPIを呼び出す

    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const merchantOrderId = `order_${Date.now()}`;

    // 処理時間のシミュレーション
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      paymentId,
      status: 'completed',
      merchantOrderId,
    };
  }

  /**
   * 返金処理
   */
  async refundPayment(
    paymentId: string,
    amount?: number
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    // TODO: 返金処理の実装
    const refundId = `ref_${uuidv4().replace(/-/g, '').slice(0, 24)}`;

    return {
      success: true,
      refundId,
    };
  }
}

// シングルトンインスタンス
export const paymentService = new PaymentService();
