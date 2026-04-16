import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256署名を生成
 */
export function createSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * OpenAIからのリクエスト署名を検証
 * @param payload リクエストボディ（生の文字列）
 * @param signature リクエストヘッダーの署名（sha256=xxxx形式）
 * @param secret 共有シークレット
 * @returns 署名が有効な場合true
 */
export function verifyOpenAISignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const providedSignature = signature.slice(7); // 'sha256=' を除去
  const expectedSignature = createSignature(payload, secret);

  // タイミング攻撃を防ぐためにtimingSafeEqualを使用
  try {
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * セキュアなランダムトークンを生成
 */
export function generateSecureToken(prefix: string = 'spt'): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const base64 = Buffer.from(randomBytes).toString('base64url');
  return `${prefix}_${base64}`;
}
