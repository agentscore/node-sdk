export class AgentScoreError extends Error {
  public readonly code: string;
  public readonly status: number;
  // Response-body fields beyond `error.{code,message}` — e.g. verify_url, linked_wallets,
  // claimed_operator, actual_signer, reasons. Consumers branch on these for granular
  // recovery (see mcp's denial-code rendering for the canonical use).
  public readonly details: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'AgentScoreError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** HTTP 402 — the endpoint is not enabled for this account. */
export class PaymentRequiredError extends AgentScoreError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('payment_required', message, 402, details);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'PaymentRequiredError';
  }
}

/** HTTP 401 with `error.code = 'token_expired'` — credential is no longer valid (revoked or
 *  TTL-expired; the API deliberately doesn't disclose which). The body carries an auto-minted
 *  verification session — exposed here so callers can recover without re-parsing `details`. */
export class TokenExpiredError extends AgentScoreError {
  public readonly verifyUrl?: string;
  public readonly sessionId?: string;
  public readonly pollSecret?: string;
  public readonly pollUrl?: string;
  public readonly nextSteps?: unknown;
  public readonly agentMemory?: unknown;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super('token_expired', message, 401, details);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'TokenExpiredError';
    this.verifyUrl = typeof details.verify_url === 'string' ? details.verify_url : undefined;
    this.sessionId = typeof details.session_id === 'string' ? details.session_id : undefined;
    this.pollSecret = typeof details.poll_secret === 'string' ? details.poll_secret : undefined;
    this.pollUrl = typeof details.poll_url === 'string' ? details.poll_url : undefined;
    this.nextSteps = details.next_steps;
    this.agentMemory = details.agent_memory;
  }
}

/** HTTP 401 with `error.code = 'invalid_credential'` — the operator_token doesn't match any
 *  credential. Permanent: no auto-session is issued. Caller should switch tokens or restart. */
export class InvalidCredentialError extends AgentScoreError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('invalid_credential', message, 401, details);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvalidCredentialError';
  }
}

/** HTTP 429 with `error.code = 'quota_exceeded'` — account-level cap reached. Don't retry;
 *  the cap won't lift through retry alone. Distinct from per-second `RateLimitedError`. */
export class QuotaExceededError extends AgentScoreError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('quota_exceeded', message, 429, details);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'QuotaExceededError';
  }
}

/** HTTP 429 with `error.code = 'rate_limited'` — per-second sliding-window limit hit. Retry
 *  after the interval indicated by the `Retry-After` header (typically ≤1s). */
export class RateLimitedError extends AgentScoreError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('rate_limited', message, 429, details);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'RateLimitedError';
  }
}

/** Request timed out or was aborted at the network layer (the AbortController fired before a
 *  response arrived). Distinct from generic network errors so callers can branch on retry vs
 *  surface-to-user without parsing message strings. */
export class TimeoutError extends AgentScoreError {
  constructor(message: string) {
    super('timeout', message, 0);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'TimeoutError';
  }
}
