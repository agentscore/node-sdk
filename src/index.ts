import { AgentScoreError } from './errors';
import type {
  AgentScoreConfig,
  AgentScoreErrorBody,
  AssessOptions,
  AssessResponse,
  AssociateWalletOptions,
  AssociateWalletResponse,
  CredentialCreateOptions,
  CredentialCreateResponse,
  CredentialListResponse,
  CredentialRevokeResponse,
  GetReputationOptions,
  ReputationResponse,
  SessionCreateOptions,
  SessionCreateResponse,
  SessionPollResponse,
} from './types';

export { AgentScoreError } from './errors';
export {
  verifyWebhookSignature,
  type VerifyWebhookSignatureInput,
  type VerifyWebhookSignatureResult,
} from './webhooks';
export { AGENTSCORE_TEST_ADDRESSES, isAgentScoreTestAddress } from './test-mode';
export * from './types';

declare const __VERSION__: string;

const DEFAULT_BASE_URL = 'https://api.agentscore.sh';
const DEFAULT_TIMEOUT = 10_000;

export class AgentScore {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly userAgent: string;

  constructor(config: AgentScoreConfig) {
    if (!config.apiKey) {
      throw new Error('AgentScore API key is required. Get one at https://agentscore.sh/sign-up');
    }
    let base = config.baseUrl ?? DEFAULT_BASE_URL;
    while (base.endsWith('/')) base = base.slice(0, -1);
    this.baseUrl = base;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    const defaultUa = `@agent-score/sdk@${__VERSION__}`;
    this.userAgent = config.userAgent ? `${config.userAgent} (${defaultUa})` : defaultUa;
  }

  async getReputation(address: string, options?: GetReputationOptions): Promise<ReputationResponse> {
    const params = new URLSearchParams();
    if (options?.chain) params.set('chain', options.chain);
    const qs = params.toString();
    return this.request<ReputationResponse>(
      `/v1/reputation/${encodeURIComponent(address)}${qs ? `?${qs}` : ''}`,
    );
  }

  async assess(address: string, options?: AssessOptions): Promise<AssessResponse>;
  async assess(address: null, options: AssessOptions & { operatorToken: string }): Promise<AssessResponse>;
  async assess(address: string | null, options?: AssessOptions): Promise<AssessResponse> {
    const body: Record<string, unknown> = {};
    if (address) body.address = address;
    if (options?.operatorToken) body.operator_token = options.operatorToken;
    if (options?.chain) body.chain = options.chain;
    if (options?.refresh !== undefined) body.refresh = options.refresh;
    if (options?.policy) body.policy = options.policy;

    return this.request<AssessResponse>('/v1/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async createSession(options?: SessionCreateOptions): Promise<SessionCreateResponse> {
    const body: Record<string, unknown> = {};
    if (options?.context) body.context = options.context;
    if (options?.product_name) body.product_name = options.product_name;
    if (options?.address) body.address = options.address;
    if (options?.operator_token) body.operator_token = options.operator_token;

    return this.request<SessionCreateResponse>('/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async pollSession(sessionId: string, pollSecret: string): Promise<SessionPollResponse> {
    return this.request<SessionPollResponse>(
      `/v1/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { 'X-Poll-Secret': pollSecret },
      },
    );
  }

  async createCredential(options?: CredentialCreateOptions): Promise<CredentialCreateResponse> {
    const body: Record<string, unknown> = {};
    if (options?.label) body.label = options.label;
    if (options?.ttl_days !== undefined) body.ttl_days = options.ttl_days;

    return this.request<CredentialCreateResponse>('/v1/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async listCredentials(): Promise<CredentialListResponse> {
    return this.request<CredentialListResponse>('/v1/credentials');
  }

  async revokeCredential(id: string): Promise<CredentialRevokeResponse> {
    return this.request<CredentialRevokeResponse>(
      `/v1/credentials/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Report that a wallet paid under an operator credential. Paid-tier merchants observing
   * agent payments call this passively to build a cross-merchant credential↔wallet profile.
   *
   * Fire-and-forget friendly — the returned `first_seen` boolean is informational only.
   */
  async associateWallet(options: AssociateWalletOptions): Promise<AssociateWalletResponse> {
    const body: Record<string, unknown> = {
      operator_token: options.operatorToken,
      wallet_address: options.walletAddress,
      network: options.network,
    };
    if (options.idempotencyKey) {
      if (options.idempotencyKey.length > 200) {
        // Server truncates to 200 chars before storing. A caller sending a longer key
        // and re-sending the same long key later would still dedup (both truncate to
        // the same 200 chars), but any caller generating distinct keys that share the
        // first 200 chars would silently collide. Warn loud enough to catch in dev.
        console.warn('[@agent-score/sdk] associateWallet: idempotencyKey is longer than 200 chars and will be truncated server-side.');
      }
      body.idempotency_key = options.idempotencyKey;
    }
    return this.request<AssociateWalletResponse>('/v1/credentials/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
      'X-API-Key': this.apiKey,
      'User-Agent': this.userAgent,
    };

    const controller = new AbortController();
    const { signal } = controller;
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1000;
        await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 10_000)));

        // Fresh controller for the retry. Reusing the original signal would let a stale
        // timeout abort the retry mid-flight (the original timer keeps running while we
        // wait retry-after, and may already have fired by the time the retry starts).
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), this.timeout);
        try {
          const retry = await fetch(url, { ...options, headers, signal: retryController.signal });
          if (retry.ok) return (await retry.json()) as T;

          throw new AgentScoreError('rate_limited', 'Rate limit exceeded', 429);
        } finally {
          clearTimeout(retryTimer);
        }
      }

      if (!response.ok) {
        let code = 'unknown_error';
        let message = `Request failed with status ${response.status}`;
        let details: Record<string, unknown> = {};

        try {
          const body = (await response.json()) as AgentScoreErrorBody & Record<string, unknown>;
          if (body?.error) {
            code = body.error.code;
            message = body.error.message;
          }
          // Preserve everything except the parsed `error` block so consumers can read
          // verify_url, linked_wallets, reasons, etc. for granular denial recovery.
          const { error: _omit, ...rest } = body;
          details = rest;
        } catch {
          // Use defaults
        }

        throw new AgentScoreError(code, message, response.status, details);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof AgentScoreError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = signal.aborted ? 'timeout' : 'network_error';
      throw new AgentScoreError(code, message, 0);
    } finally {
      clearTimeout(timer);
    }
  }
}
