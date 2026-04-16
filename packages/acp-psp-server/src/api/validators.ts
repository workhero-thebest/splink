import { z } from 'zod';

/** カートアイテムのスキーマ */
const cartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3),
});

/** 配送情報のスキーマ */
const shippingInfoSchema = z.object({
  name: z.string().min(1),
  postalCode: z.string().min(1),
  prefecture: z.string().min(1),
  city: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  phone: z.string().optional(),
});

/** カート詳細のスキーマ */
const cartDetailsSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  shipping: shippingInfoSchema.optional(),
  subtotal: z.number().nonnegative(),
  shippingFee: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  total: z.number().positive(),
});

/** Delegated Payment リクエストのスキーマ */
export const delegatedPaymentRequestSchema = z.object({
  paymentToken: z.string().regex(/^spt_[A-Za-z0-9_-]+$/, 'Invalid payment token format'),
  merchantId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  cartDetails: cartDetailsSchema,
});

/** トークン生成リクエストのスキーマ */
export const tokenGenerationRequestSchema = z.object({
  merchantId: z.string().min(1),
  maxAmount: z.number().positive(),
  currency: z.string().length(3).default('JPY'),
  validityMinutes: z.number().int().positive().max(1440).default(60), // 最大24時間
  allowedPaymentMethods: z.array(z.string()).optional(),
});

/** Webhook登録リクエストのスキーマ */
export const webhookRegistrationSchema = z.object({
  url: z.string().url(),
  events: z.array(
    z.enum([
      'order.created',
      'order.confirmed',
      'order.shipped',
      'order.delivered',
      'order.cancelled',
      'order.refunded',
    ])
  ).min(1),
  secret: z.string().min(32).optional(),
});

export type DelegatedPaymentRequestInput = z.infer<typeof delegatedPaymentRequestSchema>;
export type TokenGenerationRequestInput = z.infer<typeof tokenGenerationRequestSchema>;
export type WebhookRegistrationInput = z.infer<typeof webhookRegistrationSchema>;
