export class AgentScoreError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'AgentScoreError';
    this.code = code;
    this.status = status;
  }
}
