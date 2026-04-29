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
