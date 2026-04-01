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
  subject: { chains: ['base'], address: WALLET },
  score: { value: 85, grade: 'A', status: 'scored' },
  chains: [{ chain: 'base', score: { value: 85, grade: 'A' }, classification: { entity_type: 'agent' }, identity: {}, activity: {}, evidence_summary: {} }],
  data_semantics: 'v1',
  caveats: [],
  updated_at: '2024-01-01T00:00:00Z',
};

const ASSESS_RESPONSE = {
  subject: { chains: ['base'], address: WALLET },
  score: { value: 85, grade: 'A', status: 'scored' },
  chains: [{ chain: 'base', score: { value: 85, grade: 'A' }, classification: { entity_type: 'agent' }, identity: {}, activity: {}, evidence_summary: {} }],
  decision: 'allow',
  decision_reasons: [],
  on_the_fly: false,
  data_semantics: 'v1',
  caveats: [],
  updated_at: '2024-01-01T00:00:00Z',
  agents: [],
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
  afterEach(() => vi.restoreAllMocks());

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

  it('sends User-Agent header with package version', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getReputation(WALLET);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['User-Agent']).toBe(`agentscore-sdk/${__VERSION__}`);
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

  it('does not send chain param when not provided', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getReputation(WALLET);
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.agentscore.sh/v1/reputation/${WALLET}`,
      expect.anything(),
    );
  });

  it('sends chain query param when provided', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getReputation(WALLET, { chain: 'base' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('chain=base'),
      expect.anything(),
    );
  });

  it('throws AgentScoreError on non-OK response with structured error body', async () => {
    mockFetchError(404, { error: { code: 'not_found', message: 'Wallet not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.getReputation(WALLET)).rejects.toBeInstanceOf(AgentScoreError);
  });

  it('AgentScoreError has the correct code and status on failure', async () => {
    expect.assertions(4);
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
    expect.assertions(3);
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

  it('includes chain in request body when provided', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, { chain: 'ethereum' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.chain).toBe('ethereum');
  });

  it('includes refresh: true in request body when provided', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, { refresh: true });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.refresh).toBe(true);
  });

  it('includes refresh: false in request body (not dropped)', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, { refresh: false });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.refresh).toBe(false);
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

  it('converts boolean filter has_endpoint: true to query param "true"', async () => {
    mockFetchOk(AGENTS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getAgents({ has_endpoint: true });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('has_endpoint=true'),
      expect.anything(),
    );
  });

  it('converts boolean filter has_endpoint: false to query param "false"', async () => {
    mockFetchOk(AGENTS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getAgents({ has_endpoint: false });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('has_endpoint=false'),
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

// ---------------------------------------------------------------------------
// Timeout & Network Errors
// ---------------------------------------------------------------------------

describe('Timeout and network errors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws AgentScoreError with code timeout on slow response', async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal as AbortSignal;
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
    });

    const client = new AgentScore({ apiKey: API_KEY, timeout: 10 });

    try {
      await client.getReputation(WALLET);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('timeout');
      expect(err.status).toBe(0);
    }
  });

  it('throws AgentScoreError with code network_error on fetch rejection', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const client = new AgentScore({ apiKey: API_KEY });

    try {
      await client.getReputation(WALLET);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('network_error');
      expect(err.status).toBe(0);
      expect(err.message).toBe('Failed to fetch');
    }
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  afterEach(() => vi.restoreAllMocks());

  it('getReputation encodes special characters in address', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const weirdAddress = '0xabc/def?foo=bar&baz=qux#hash';
    await client.getReputation(weirdAddress);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain(encodeURIComponent(weirdAddress));
    expect(url).not.toContain('0xabc/def');
  });

  it('falls back to unknown_error when response.json() throws', async () => {
    expect.assertions(3);
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: vi.fn().mockRejectedValueOnce(new SyntaxError('Unexpected token')),
    } as unknown as Response);

    const client = new AgentScore({ apiKey: API_KEY });
    try {
      await client.getReputation(WALLET);
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('unknown_error');
      expect(err.status).toBe(502);
    }
  });

  it('getAgents omits undefined option values from query params', async () => {
    mockFetchOk(AGENTS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getAgents({ chain: 'base', limit: undefined });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain('chain=base');
    expect(url).not.toContain('limit');
  });

  it('assess sends chain, refresh, and policy all at once', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, {
      chain: 'base',
      refresh: true,
      policy: { min_score: 50, require_verified_payment_activity: true },
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.address).toBe(WALLET);
    expect(body.chain).toBe('base');
    expect(body.refresh).toBe(true);
    expect(body.policy).toEqual({ min_score: 50, require_verified_payment_activity: true });
  });

  it('two concurrent getReputation calls both resolve correctly', async () => {
    const response2 = { ...REPUTATION_RESPONSE, subject: { chains: ['ethereum'], address: '0xdef456' } };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(REPUTATION_RESPONSE),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(response2),
      } as unknown as Response);

    const client = new AgentScore({ apiKey: API_KEY });
    const [r1, r2] = await Promise.all([
      client.getReputation(WALLET),
      client.getReputation('0xdef456'),
    ]);
    expect(r1).toMatchObject(REPUTATION_RESPONSE);
    expect(r2).toMatchObject(response2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('getAgents passes through empty items array', async () => {
    const emptyResponse = { items: [], next_cursor: null, count: 0, version: '1' };
    mockFetchOk(emptyResponse);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getAgents({ chain: 'base' });
    expect(result.items).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('assess includes refresh: false in request body', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, { refresh: false });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty('refresh');
    expect(body.refresh).toBe(false);
  });

  it('getReputation appends chain to query string', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.getReputation(WALLET, { chain: 'ethereum' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toBe(`https://api.agentscore.sh/v1/reputation/${WALLET}?chain=ethereum`);
  });
});
