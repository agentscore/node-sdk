import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../src/webhooks';

const SECRET = 'whsec_testsecret';

function sign(payload: string, ts: number, secret = SECRET): string {
  const signed = `${ts}.${payload}`;
  return createHmac('sha256', secret).update(signed).digest('hex');
}

describe('verifyWebhookSignature', () => {
  it('accepts a valid signature with current timestamp', () => {
    const payload = '{"event":"test"}';
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(payload, ts);
    const result = verifyWebhookSignature({
      payload,
      signatureHeader: `t=${ts},v1=${sig}`,
      secret: SECRET,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts Buffer payload', () => {
    const payload = Buffer.from('{"event":"test"}', 'utf-8');
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(payload.toString('utf-8'), ts);
    const result = verifyWebhookSignature({ payload, signatureHeader: `t=${ts},v1=${sig}`, secret: SECRET });
    expect(result.valid).toBe(true);
  });

  it('rejects timestamp older than tolerance', () => {
    const payload = '{}';
    const ts = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
    const sig = sign(payload, ts);
    const result = verifyWebhookSignature({
      payload,
      signatureHeader: `t=${ts},v1=${sig}`,
      secret: SECRET,
      toleranceSeconds: 300,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('timestamp_too_old');
  });

  it('rejects timestamp too far in the future', () => {
    const payload = '{}';
    const ts = Math.floor(Date.now() / 1000) + 600;
    const sig = sign(payload, ts);
    const result = verifyWebhookSignature({
      payload,
      signatureHeader: `t=${ts},v1=${sig}`,
      secret: SECRET,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('timestamp_in_future');
  });

  it('rejects signature mismatch (wrong secret)', () => {
    const payload = '{}';
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(payload, ts, 'wrong_secret');
    const result = verifyWebhookSignature({
      payload,
      signatureHeader: `t=${ts},v1=${sig}`,
      secret: SECRET,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_mismatch');
  });

  it('returns no_signatures for empty header', () => {
    const result = verifyWebhookSignature({ payload: '{}', signatureHeader: '', secret: SECRET });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('no_signatures');
  });

  it('returns malformed_header for parts without =', () => {
    const result = verifyWebhookSignature({ payload: '{}', signatureHeader: 'just_a_value', secret: SECRET });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('malformed_header');
  });

  it('returns no_timestamp when timestamp missing and tolerance > 0', () => {
    const payload = '{}';
    const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
    const result = verifyWebhookSignature({ payload, signatureHeader: `v1=${sig}`, secret: SECRET });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('no_timestamp');
  });

  it('skips timestamp check when toleranceSeconds=0 (raw HMAC)', () => {
    const payload = '{"event":"test"}';
    const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
    const result = verifyWebhookSignature({
      payload,
      signatureHeader: `v1=${sig}`,
      secret: SECRET,
      toleranceSeconds: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts multiple signatures and matches any', () => {
    const payload = '{}';
    const ts = Math.floor(Date.now() / 1000);
    const sigGood = sign(payload, ts);
    const sigBad = createHmac('sha256', 'wrong').update(`${ts}.${payload}`).digest('hex');
    const result = verifyWebhookSignature({
      payload,
      signatureHeader: `t=${ts},v1=${sigBad},v1=${sigGood}`,
      secret: SECRET,
    });
    expect(result.valid).toBe(true);
  });
});
