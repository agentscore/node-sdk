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
  chains: [{ chain: 'base', score: { value: 85, grade: 'A' }, classification: { entity_type: 'agent' }, identity: {}, activity: {}, evidence_summary: { metadata_kind: null, has_a2a_agent_card: false, website_url: null, website_reachable: false, website_mentions_mcp: false, website_mentions_x402: false, github_url: null, github_stars: null } }],
  data_semantics: 'v1',
  caveats: [],
  updated_at: '2024-01-01T00:00:00Z',
};

const ASSESS_RESPONSE = {
  subject: { chains: ['base'], address: WALLET },
  score: { value: 85, grade: 'A', status: 'scored' },
  chains: [{ chain: 'base', score: { value: 85, grade: 'A' }, classification: { entity_type: 'agent' }, identity: {}, activity: {}, evidence_summary: { metadata_kind: null, has_a2a_agent_card: false, website_url: null, website_reachable: false, website_mentions_mcp: false, website_mentions_x402: false, github_url: null, github_stars: null } }],
  decision: 'allow',
  decision_reasons: [],
  on_the_fly: false,
  data_semantics: 'v1',
  caveats: [],
  updated_at: '2024-01-01T00:00:00Z',
  agents: [],
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
    expect(headers['User-Agent']).toBe(`@agent-score/sdk@${__VERSION__}`);
  });

  it('prepends custom userAgent to the default when configured', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY, userAgent: 'my-app/1.2.3' });
    await client.getReputation(WALLET);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['User-Agent']).toBe(`my-app/1.2.3 (@agent-score/sdk@${__VERSION__})`);
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
        headers: expect.objectContaining({ 'X-API-Key': API_KEY }),
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
    await client.assess(WALLET, { policy: { require_kyc: true } });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.policy).toEqual({ require_kyc: true });
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

  it('assess sends chain, refresh, and policy all at once', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, {
      chain: 'base',
      refresh: true,
      policy: { require_kyc: true, require_sanctions_clear: true },
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.address).toBe(WALLET);
    expect(body.chain).toBe('base');
    expect(body.refresh).toBe(true);
    expect(body.policy).toEqual({ require_kyc: true, require_sanctions_clear: true });
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

// ---------------------------------------------------------------------------
// Verification / Compliance types and fields
// ---------------------------------------------------------------------------

describe('Verification and compliance fields', () => {
  afterEach(() => vi.restoreAllMocks());

  it('getReputation returns verification_level when present', async () => {
    const response = {
      ...REPUTATION_RESPONSE,
      verification_level: 'kyc_verified' as const,
    };
    mockFetchOk(response);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getReputation(WALLET);
    expect(result.verification_level).toBe('kyc_verified');
  });

  it('getReputation omits verification_level when not present', async () => {
    mockFetchOk(REPUTATION_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getReputation(WALLET);
    expect(result.verification_level).toBeUndefined();
  });

  it('assess response includes operator_verification when present', async () => {
    const response = {
      ...ASSESS_RESPONSE,
      operator_verification: {
        level: 'kyc_verified',
        operator_type: 'business',
        verified_at: '2024-06-15T00:00:00Z',
      },
    };
    mockFetchOk(response);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.assess(WALLET);
    expect(result.operator_verification).toBeDefined();
    expect(result.operator_verification!.level).toBe('kyc_verified');
    expect(result.operator_verification!.operator_type).toBe('business');
    expect(result.operator_verification!.verified_at).toBe('2024-06-15T00:00:00Z');
  });

  it('assess response includes verify_url when present', async () => {
    const response = {
      ...ASSESS_RESPONSE,
      decision: 'deny',
      decision_reasons: ['kyc_required'],
      verify_url: 'https://agentscore.sh/verify/abc123',
    };
    mockFetchOk(response);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.assess(WALLET);
    expect(result.verify_url).toBe('https://agentscore.sh/verify/abc123');
    expect(result.decision).toBe('deny');
  });

  it('assess response omits operator_verification and verify_url when not present', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.assess(WALLET);
    expect(result.operator_verification).toBeUndefined();
    expect(result.verify_url).toBeUndefined();
  });

  it('assess sends new compliance policy fields', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, {
      policy: {
        require_kyc: true,
        require_sanctions_clear: true,
        min_age: 90,
        blocked_jurisdictions: ['KP', 'IR'],
      },
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    const policy = body.policy as Record<string, unknown>;
    expect(policy.require_kyc).toBe(true);
    expect(policy.require_sanctions_clear).toBe(true);
    expect(policy.min_age).toBe(90);
    expect(policy.blocked_jurisdictions).toEqual(['KP', 'IR']);
  });

  it('assess sends resolved_operator when present in response', async () => {
    const response = {
      ...ASSESS_RESPONSE,
      resolved_operator: '0xoperator456',
    };
    mockFetchOk(response);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.assess(WALLET);
    expect(result.resolved_operator).toBe('0xoperator456');
  });
});

// ---------------------------------------------------------------------------
// Integration-style: compliance deny with verify_url
// ---------------------------------------------------------------------------

describe('Integration: compliance policy deny with verify_url', () => {
  afterEach(() => vi.restoreAllMocks());

  it('full assess flow returns deny with verify_url for compliance policy', async () => {
    const complianceDenyResponse = {
      subject: { chains: ['base'], address: WALLET },
      score: { value: 72, grade: 'C', status: 'scored' },
      chains: [{
        chain: 'base',
        score: { value: 72, grade: 'C' },
        classification: { entity_type: 'wallet' },
        identity: {},
        activity: {},
        evidence_summary: { metadata_kind: null, has_a2a_agent_card: false, website_url: null, website_reachable: false, website_mentions_mcp: false, website_mentions_x402: false, github_url: null, github_stars: null },
      }],
      decision: 'deny',
      decision_reasons: ['kyc_required', 'sanctions_flagged'],
      on_the_fly: false,
      data_semantics: 'v1',
      caveats: [],
      updated_at: '2024-01-01T00:00:00Z',
      agents: [],
      operator_verification: {
        level: 'none',
        operator_type: null,
        verified_at: null,
      },
      verify_url: 'https://agentscore.sh/verify/xyz789',
    };

    mockFetchOk(complianceDenyResponse);

    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.assess(WALLET, {
      policy: {
        require_kyc: true,
        require_sanctions_clear: true,
      },
    });

    expect(result.decision).toBe('deny');
    expect(result.decision_reasons).toContain('kyc_required');
    expect(result.decision_reasons).toContain('sanctions_flagged');
    expect(result.verify_url).toBe('https://agentscore.sh/verify/xyz789');
    expect(result.operator_verification).toBeDefined();
    expect(result.operator_verification!.level).toBe('none');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    const policy = body.policy as Record<string, unknown>;
    expect(policy.require_kyc).toBe(true);
    expect(policy.require_sanctions_clear).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Identity model: operatorToken in assess
// ---------------------------------------------------------------------------

describe('AgentScore.assess() — operatorToken', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends operator_token when operatorToken option provided without address', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(null, { operatorToken: 'opc_test_123' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.operator_token).toBe('opc_test_123');
    expect(body.address).toBeUndefined();
  });

  it('sends both address and operator_token when both provided', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET, { operatorToken: 'opc_both_456' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.address).toBe(WALLET);
    expect(body.operator_token).toBe('opc_both_456');
  });

  it('sends only address when no operatorToken (backwards compat)', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(WALLET);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.address).toBe(WALLET);
    expect(body.operator_token).toBeUndefined();
  });

  it('sends operator_token with policy and chain combined', async () => {
    mockFetchOk(ASSESS_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.assess(null, {
      operatorToken: 'opc_full',
      chain: 'base',
      policy: { require_kyc: true },
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.operator_token).toBe('opc_full');
    expect(body.chain).toBe('base');
    expect(body.address).toBeUndefined();
    expect((body.policy as Record<string, unknown>).require_kyc).toBe(true);
  });

  it('retries on 429 with Retry-After header', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0' }),
        json: vi.fn().mockResolvedValueOnce({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(REPUTATION_RESPONSE),
      } as unknown as Response);

    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.getReputation(WALLET);
    expect(result.score.grade).toBe('A');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after 429 retry fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0' }),
        json: vi.fn().mockResolvedValueOnce({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValueOnce({}),
      } as unknown as Response);

    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.getReputation(WALLET)).rejects.toThrow(AgentScoreError);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('aborts the retry when the retry timer fires', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': '0' }),
          json: vi.fn().mockResolvedValueOnce({}),
        } as unknown as Response);
      }
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
    }
    expect(callCount).toBe(2);
  });
});
