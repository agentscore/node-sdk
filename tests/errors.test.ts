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
});
