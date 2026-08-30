import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyMuxWebhookSignature } from './mux-signature';

const SECRET = 'test-webhook-secret';
const BODY = '{"type":"video.asset.ready","data":{"id":"abc"}}';

function header(body = BODY, timestamp = '1700000000', secret = SECRET): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('verifyMuxWebhookSignature', () => {
  it('accepts a matching timestamp and HMAC', () => {
    expect(
      verifyMuxWebhookSignature({
        rawBody: BODY,
        signatureHeader: header(),
        secret: SECRET,
        nowMs: 1_700_000_000_000,
      }),
    ).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(
      verifyMuxWebhookSignature({
        rawBody: '{"type":"video.asset.ready","data":{"id":"evil"}}',
        signatureHeader: header(),
        secret: SECRET,
        nowMs: 1_700_000_000_000,
      }),
    ).toBe(false);
  });

  it('rejects a replay older than five minutes', () => {
    expect(
      verifyMuxWebhookSignature({
        rawBody: BODY,
        signatureHeader: header(),
        secret: SECRET,
        nowMs: 1_700_000_000_000 + 6 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(
      verifyMuxWebhookSignature({
        rawBody: BODY,
        signatureHeader: undefined,
        secret: SECRET,
        nowMs: 1_700_000_000_000,
      }),
    ).toBe(false);
  });
});
