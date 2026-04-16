import { Router, type Request, type Response } from 'express';
import type { OrderUpdatePayload, OrderEventType } from '../types/index.js';
import { createSignature } from '../utils/crypto.js';

const router = Router();

/** 登録されたWebhookエンドポイント */
interface WebhookEndpoint {
  url: string;
  events: OrderEventType[];
  secret: string;
}

// Webhookエンドポイントの管理（本番ではDBに保存）
const webhookEndpoints: Map<string, WebhookEndpoint> = new Map();

/**
 * POST /webhooks/register
 *
 * Webhookエンドポイントを登録
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { url, events, secret } = req.body as {
    url: string;
    events: OrderEventType[];
    secret?: string;
  };

  if (!url || !events || events.length === 0) {
    res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'url and events are required',
      },
    });
    return;
  }

  const webhookId = `wh_${Date.now()}`;
  const webhookSecret = secret || `whsec_${crypto.randomUUID().replace(/-/g, '')}`;

  webhookEndpoints.set(webhookId, {
    url,
    events,
    secret: webhookSecret,
  });

  res.status(201).json({
    webhookId,
    url,
    events,
    secret: webhookSecret,
  });
});

/**
 * DELETE /webhooks/:webhookId
 *
 * Webhookエンドポイントを削除
 */
router.delete('/:webhookId', async (req: Request, res: Response): Promise<void> => {
  const { webhookId } = req.params;

  const deleted = webhookEndpoints.delete(webhookId);

  if (!deleted) {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: 'Webhook not found',
      },
    });
    return;
  }

  res.status(204).send();
});

/**
 * ORDER_UPDATEイベントを送信
 *
 * 登録されたWebhookエンドポイントにイベントを配信
 */
export async function sendOrderUpdate(payload: OrderUpdatePayload): Promise<void> {
  const payloadString = JSON.stringify(payload);

  const deliveryPromises = Array.from(webhookEndpoints.values())
    .filter((endpoint) => endpoint.events.includes(payload.event))
    .map(async (endpoint) => {
      const signature = `sha256=${createSignature(payloadString, endpoint.secret)}`;

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SPLink-Signature': signature,
            'X-SPLink-Event': payload.event,
          },
          body: payloadString,
        });

        if (!response.ok) {
          console.error(`Webhook delivery failed to ${endpoint.url}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Webhook delivery error to ${endpoint.url}:`, error);
      }
    });

  await Promise.allSettled(deliveryPromises);
}

export { router as webhookRouter };
