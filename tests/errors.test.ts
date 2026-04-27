import { describe, expect, it } from 'vitest';
import { AgentScoreError } from '../src/errors';

describe('AgentScoreError', () => {
  it('is an instance of Error', () => {
    const err = new AgentScoreError('not_found', 'Not found', 404);
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of AgentScoreError', () => {
    const err = new AgentScoreError('not_found', 'Not found', 404);
    expect(err).toBeInstanceOf(AgentScoreError);
  });

  it('sets name to AgentScoreError', () => {
    const err = new AgentScoreError('not_found', 'Not found', 404);
    expect(err.name).toBe('AgentScoreError');
  });

  it('exposes the error code', () => {
    const err = new AgentScoreError('unauthorized', 'Unauthorized', 401);
    expect(err.code).toBe('unauthorized');
  });

  it('exposes the HTTP status', () => {
    const err = new AgentScoreError('unauthorized', 'Unauthorized', 401);
    expect(err.status).toBe(401);
  });

  it('exposes the message via Error.message', () => {
    const err = new AgentScoreError('rate_limited', 'Too many requests', 429);
    expect(err.message).toBe('Too many requests');
  });

  it('defaults details to an empty object when omitted', () => {
    const err = new AgentScoreError('not_found', 'Not found', 404);
    expect(err.details).toEqual({});
  });

  it('preserves response-body fields beyond {code, message} for granular recovery', () => {
    const err = new AgentScoreError('wallet_signer_mismatch', 'Signer mismatch', 403, {
      claimed_operator: 'op_abc',
      actual_signer: '0xdef',
      linked_wallets: ['0xabc', '0xdef'],
    });
    expect(err.details.claimed_operator).toBe('op_abc');
    expect(err.details.linked_wallets).toEqual(['0xabc', '0xdef']);
  });
});
