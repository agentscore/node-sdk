/**
 * Webhook signature verification — HMAC-SHA256 based, Stripe-pattern.
 *
 * Use this when AgentScore (or any service that signs outbound webhooks with this
 * convention) sends a webhook to your endpoint. Validates the `X-AgentScore-Signature`
 * (or compatible) header before trusting the payload.
 *
 * Generic enough to cover any HMAC-signed webhook source: pass the right secret + header
 * name. Tolerant of multiple signature versions in the same header (Stripe `t=...,v1=...`
 * style supported via the `prefixSeparator` parsing option).
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface VerifyWebhookSignatureInput {
  /** Raw request body (string or Buffer). MUST be the unparsed body — even one byte of
   *  re-serialization breaks the signature. Capture before any JSON parse. */
  payload: string | Buffer;
  /** Value of the signature header from the incoming request. */
  signatureHeader: string;
  /** The shared secret the sender uses to sign. Per-merchant when AgentScore eventually
   *  ships webhooks; otherwise whatever the upstream provider issued. */
  secret: string;
  /** Tolerance in seconds for timestamp-replay protection. Default 300 (5 min) per
   *  Stripe convention. Set to 0 to disable timestamp checking. */
  toleranceSeconds?: number;
  /** Override the timestamp parameter name in the header. Default `t`. */
  timestampKey?: string;
  /** Override the signature parameter name. Default `v1`. Stripe v1 uses HMAC-SHA256. */
  signatureKey?: string;
}

export interface VerifyWebhookSignatureResult {
  valid: boolean;
  /** Reason the verification failed; only set when `valid: false`. */
  reason?: 'no_signatures' | 'no_timestamp' | 'timestamp_too_old' | 'timestamp_in_future' | 'signature_mismatch' | 'malformed_header';
}

/**
 * Verify an HMAC-SHA256 signed webhook signature. Stripe-compatible header format:
 *   `t=<unix_seconds>,v1=<hex_hmac>`
 *
 * The signed payload is `${timestamp}.${rawBody}`. Returns `{ valid: false, reason }`
 * for any failure path so callers can differentiate transient (timestamp drift) from
 * permanent (mismatch) failures.
 *
 * Example:
 * ```ts
 * app.post('/webhooks/agentscore', express.raw({ type: 'application/json' }), (req, res) => {
 *   const result = verifyWebhookSignature({
 *     payload: req.body, // raw Buffer
 *     signatureHeader: req.header('x-agentscore-signature') ?? '',
 *     secret: process.env.AGENTSCORE_WEBHOOK_SECRET!,
 *   });
 *   if (!result.valid) return res.status(400).json({ error: result.reason });
 *   const event = JSON.parse(req.body.toString());
 *   // ... handle event ...
 * });
 * ```
 */
export function verifyWebhookSignature(input: VerifyWebhookSignatureInput): VerifyWebhookSignatureResult {
  const tolerance = input.toleranceSeconds ?? 300;
  const tsKey = input.timestampKey ?? 't';
  const sigKey = input.signatureKey ?? 'v1';

  const parts = input.signatureHeader.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { valid: false, reason: 'no_signatures' };

  const params = new Map<string, string[]>();
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq < 0) return { valid: false, reason: 'malformed_header' };
    const key = p.slice(0, eq);
    const value = p.slice(eq + 1);
    const list = params.get(key) ?? [];
    list.push(value);
    params.set(key, list);
  }

  const timestampStr = params.get(tsKey)?.[0];
  if (tolerance > 0) {
    if (!timestampStr) return { valid: false, reason: 'no_timestamp' };
    const ts = Number(timestampStr);
    if (!Number.isFinite(ts)) return { valid: false, reason: 'no_timestamp' };
    const nowSec = Math.floor(Date.now() / 1000);
    if (ts < nowSec - tolerance) return { valid: false, reason: 'timestamp_too_old' };
    if (ts > nowSec + tolerance) return { valid: false, reason: 'timestamp_in_future' };
  }

  const signatures = params.get(sigKey) ?? [];
  if (signatures.length === 0) return { valid: false, reason: 'no_signatures' };

  const payloadBuffer = typeof input.payload === 'string' ? Buffer.from(input.payload, 'utf-8') : input.payload;
  const signedPayload = timestampStr
    ? Buffer.concat([Buffer.from(`${timestampStr}.`, 'utf-8'), payloadBuffer])
    : payloadBuffer;

  const expectedHex = createHmac('sha256', input.secret).update(signedPayload).digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  for (const sigHex of signatures) {
    let actualBuf: Buffer;
    try {
      actualBuf = Buffer.from(sigHex, 'hex');
    } catch {
      continue;
    }
    if (actualBuf.length !== expectedBuf.length) continue;
    if (timingSafeEqual(actualBuf, expectedBuf)) return { valid: true };
  }

  return { valid: false, reason: 'signature_mismatch' };
}
