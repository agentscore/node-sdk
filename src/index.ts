import { AgentScoreError } from './errors';
import type {
  AgentScoreConfig,
  AgentScoreErrorBody,
  AgentsListResponse,
  AssessOptions,
  AssessResponse,
  GetAgentsOptions,
  GetReputationOptions,
  ReputationResponse,
  StatsResponse,
} from './types';

export { AgentScoreError } from './errors';
export * from './types';

const DEFAULT_BASE_URL = 'https://api.agentscore.sh';
const DEFAULT_TIMEOUT = 10_000;

export class AgentScore {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: AgentScoreConfig) {
    if (!config.apiKey) {
      throw new Error('AgentScore API key is required. Get one at https://agentscore.sh/sign-up');
    }
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  async getReputation(address: string, options?: GetReputationOptions): Promise<ReputationResponse> {
    const params = new URLSearchParams();
    if (options?.chain) params.set('chain', options.chain);
    const qs = params.toString();
    return this.request<ReputationResponse>(
      `/v1/reputation/${encodeURIComponent(address)}${qs ? `?${qs}` : ''}`,
    );
  }

  async assess(address: string, options?: AssessOptions): Promise<AssessResponse> {
    const body: Record<string, unknown> = { address };
    if (options?.chain) body.chain = options.chain;
    if (options?.refresh) body.refresh = true;
    if (options?.policy) body.policy = options.policy;

    return this.request<AssessResponse>('/v1/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async getAgents(options?: GetAgentsOptions): Promise<AgentsListResponse> {
    const params = new URLSearchParams();
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.request<AgentsListResponse>(`/v1/agents${qs ? `?${qs}` : ''}`);
  }

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/v1/stats');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
      Authorization: `Bearer ${this.apiKey}`,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let code = 'unknown_error';
        let message = `Request failed with status ${response.status}`;

        try {
          const body = (await response.json()) as AgentScoreErrorBody;
          if (body?.error) {
            code = body.error.code;
            message = body.error.message;
          }
        } catch {
          // Use defaults
        }

        throw new AgentScoreError(code, message, response.status);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
