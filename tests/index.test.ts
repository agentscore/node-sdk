import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentScore, AgentScoreError } from '../src/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_KEY = 'test-api-key';
const WALLET = '0xabc123';

function mockFetchOk(body: unknown): void {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValueOnce(body),
  } as unknown as Response);
}

function mockFetchError(status: number, errorBody?: { error: { code: string; message: string } }): void {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: vi.fn().mockResolvedValueOnce(errorBody ?? {}),
  } as unknown as Response);
}

const REPUTATION_RESPONSE = {
  subject: { chain: 'base', address: WALLET },
  score: { value: 85, grade: 'A', status: 'scored' },
  classification: { entity_type: 'agent', is_known: true },
  identity: null,
  activity: null,
  evidence_summary: null,
  data_semantics: 'v1',
  caveats: [],
  updated_at: '2024-01-01T00:00:00Z',
};

const ASSESS_RESPONSE = {
  ...REPUTATION_RESPONSE,
  decision: 'allow',
  decision_reasons: [],
  on_the_fly: false,
};

const AGENTS_RESPONSE = {
  items: [],
  next_cursor: null,
  count: 0,
  version: '1',
};

const STATS_RESPONSE = {
  version: '1',
  as_of_time: '2024-01-01T00:00:00Z',
  data_semantics: 'v1',
  payments: {
    addresses_with_candidate_payment_activity: 100,
    addresses_with_verified_payment_activity: 50,
    total_candidate_transactions: 1000,
    total_verified_transactions: 500,
    verification_status_summary: {},
  },
  caveats: [],
};

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('AgentScore constructor', () => {
  it('throws when no apiKey is provided', () => {
    expect(() => new AgentScore({ apiKey: '' })).toThrow('AgentScore API key is required');
  });

  it('constructs successfully with a valid apiKey', () => {
    const client = new AgentScore({ apiKey: API_KEY });
    expect(client).toBeInstanceOf(AgentScore);
  });

  it('accepts a custom baseUrl', () => {
    const client = new AgentScore({ apiKey: API_KEY, baseUrl: 'https://custom.example.com' });
    expect(client).toBeInstanceOf(AgentScore);
  });

  it('accepts a custom timeout', () => {
    const client = new AgentScore({ apiKey: API_KEY, timeout: 5000 });
    expect(client).toBeInstanceOf(AgentScore);
  });

  it('strips trailing slashes from baseUrl', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY, baseUrl: 'https://api.example.com///' });
    await client.getReputation(WALLET);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/reputation/0xabc123',
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// getReputation
// ---------------------------------------------------------------------------

describe('AgentScore.getReputation()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns reputation data on success', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getReputation(WALLET);
    expect(result).toMatchObject(REPUTATION_RESPONSE);
  });

  it('sends the correct GET request URL', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getReputation(WALLET);
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.agentscore.sh/v1/reputation/${WALLET}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${API_KEY}` }),
      }),
    );
  });

  it('appends chain query param when provided', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getReputation(WALLET, { chain: 'ethereum' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('chain=ethereum'),
      expect.anything(),
    );
  });

  it('throws AgentScoreError on non-OK response with structured error body', async () => {
    mockFetchError(404, { error: { code: 'not_found', message: 'Wallet not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.getReputation(WALLET)).rejects.toBeInstanceOf(AgentScoreError);
  });

  it('AgentScoreError has the correct code and status on failure', async () => {
    mockFetchError(404, { error: { code: 'not_found', message: 'Wallet not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    try {
      await client.getReputation(WALLET);
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('not_found');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Wallet not found');
    }
  });

  it('throws AgentScoreError with unknown_error code when body has no error field', async () => {
    mockFetchError(500);
    const client = new AgentScore({ apiKey: API_KEY });
    try {
      await client.getReputation(WALLET);
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('unknown_error');
      expect(err.status).toBe(500);
    }
  });
});

// ---------------------------------------------------------------------------
// assess
// ---------------------------------------------------------------------------

describe('AgentScore.assess()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns assess data on success', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.assess(WALLET);
    expect(result).toMatchObject(ASSESS_RESPONSE);
  });

  it('sends a POST request to /v1/assess', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.agentscore.sh/v1/assess',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('includes policy in request body when provided', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, { policy: { min_grade: 'B' } });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.policy).toEqual({ min_grade: 'B' });
  });

  it('throws AgentScoreError on failure', async () => {
    mockFetchError(403, { error: { code: 'forbidden', message: 'Forbidden' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.assess(WALLET)).rejects.toBeInstanceOf(AgentScoreError);
  });
});

// ---------------------------------------------------------------------------
// getAgents
// ---------------------------------------------------------------------------

describe('AgentScore.getAgents()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns agents list on success', async () => {
    mockFetchOk(AGENTS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getAgents();
    expect(result).toMatchObject(AGENTS_RESPONSE);
  });

  it('sends GET to /v1/agents', async () => {
    mockFetchOk(AGENTS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getAgents();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.agentscore.sh/v1/agents',
      expect.anything(),
    );
  });

  it('appends options as query params', async () => {
    mockFetchOk(AGENTS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getAgents({ chain: 'base', limit: 10 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('chain=base'),
      expect.anything(),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('AgentScore.getStats()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stats data on success', async () => {
    mockFetchOk(STATS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getStats();
    expect(result).toMatchObject(STATS_RESPONSE);
  });

  it('sends GET to /v1/stats', async () => {
    mockFetchOk(STATS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getStats();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.agentscore.sh/v1/stats',
      expect.anything(),
    );
  });
});
