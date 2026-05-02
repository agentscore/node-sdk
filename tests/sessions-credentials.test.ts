import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentScore, AgentScoreError } from '../src/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_KEY = 'test-api-key';

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

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

const SESSION_CREATE_RESPONSE = {
  session_id: 'sess_abc123',
  poll_secret: 'ps_secret456',
  verify_url: 'https://agentscore.sh/verify/sess_abc123',
  poll_url: 'https://api.agentscore.sh/v1/sessions/sess_abc123',
  expires_at: '2026-04-10T00:00:00Z',
};

describe('AgentScore.createSession()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns session data on success', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.createSession();
    expect(result).toMatchObject(SESSION_CREATE_RESPONSE);
  });

  it('sends a POST request to /v1/sessions', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createSession();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.agentscore.sh/v1/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends X-API-Key header', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createSession();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe(API_KEY);
  });

  it('sends empty body when no options provided', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createSession();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body).toEqual({});
  });

  it('includes context in request body when provided', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createSession({ context: 'payment-flow' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.context).toBe('payment-flow');
  });

  it('includes product_name in request body when provided', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createSession({ product_name: 'Premium Plan' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.product_name).toBe('Premium Plan');
  });

  it('includes all first-class fields when provided', async () => {
    mockFetchOk(SESSION_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createSession({
      context: 'onboarding',
      product_name: 'Starter',
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.context).toBe('onboarding');
    expect(body.product_name).toBe('Starter');
  });

  it('throws AgentScoreError on failure', async () => {
    mockFetchError(403, { error: { code: 'forbidden', message: 'Forbidden' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.createSession()).rejects.toBeInstanceOf(AgentScoreError);
  });
});

// ---------------------------------------------------------------------------
// pollSession
// ---------------------------------------------------------------------------

const SESSION_POLL_PENDING = {
  session_id: 'sess_abc123',
  status: 'pending',
};

const SESSION_POLL_COMPLETED = {
  session_id: 'sess_abc123',
  status: 'completed',
  operator_token: 'opc_token789',
  completed_at: '2026-04-09T12:00:00Z',
};

describe('AgentScore.pollSession()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns pending session status', async () => {
    mockFetchOk(SESSION_POLL_PENDING);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.pollSession('sess_abc123', 'ps_secret456');
    expect(result.session_id).toBe('sess_abc123');
    expect(result.status).toBe('pending');
    expect(result.operator_token).toBeUndefined();
  });

  it('returns completed session with operator_token', async () => {
    mockFetchOk(SESSION_POLL_COMPLETED);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.pollSession('sess_abc123', 'ps_secret456');
    expect(result.status).toBe('completed');
    expect(result.operator_token).toBe('opc_token789');
    expect(result.completed_at).toBe('2026-04-09T12:00:00Z');
  });

  it('sends GET request to /v1/sessions/{sessionId}', async () => {
    mockFetchOk(SESSION_POLL_PENDING);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.pollSession('sess_abc123', 'ps_secret456');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toBe('https://api.agentscore.sh/v1/sessions/sess_abc123');
    expect(call[1].method).toBeUndefined();
  });

  it('sends X-Poll-Secret header', async () => {
    mockFetchOk(SESSION_POLL_PENDING);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.pollSession('sess_abc123', 'ps_secret456');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['X-Poll-Secret']).toBe('ps_secret456');
  });

  it('sends X-API-Key header alongside X-Poll-Secret', async () => {
    mockFetchOk(SESSION_POLL_PENDING);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.pollSession('sess_abc123', 'ps_secret456');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe(API_KEY);
    expect(headers['X-Poll-Secret']).toBe('ps_secret456');
  });

  it('encodes special characters in sessionId', async () => {
    mockFetchOk(SESSION_POLL_PENDING);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.pollSession('sess/weird?id', 'ps_secret456');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain(encodeURIComponent('sess/weird?id'));
  });

  it('throws AgentScoreError on 404', async () => {
    mockFetchError(404, { error: { code: 'not_found', message: 'Session not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.pollSession('sess_missing', 'ps_bad')).rejects.toBeInstanceOf(AgentScoreError);
  });
});

// ---------------------------------------------------------------------------
// createCredential
// ---------------------------------------------------------------------------

const CREDENTIAL_CREATE_RESPONSE = {
  id: 'cred_abc123',
  credential: 'opc_test_abc123def456',
  prefix: 'opc_test_abc',
  label: 'Production API',
  expires_at: '2027-04-09T00:00:00Z',
  created_at: '2026-04-09T00:00:00Z',
};

describe('AgentScore.createCredential()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns credential data on success', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.createCredential();
    expect(result).toMatchObject(CREDENTIAL_CREATE_RESPONSE);
  });

  it('sends a POST request to /v1/credentials', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createCredential();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.agentscore.sh/v1/credentials',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends empty body when no options provided', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createCredential();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body).toEqual({});
  });

  it('includes label in request body when provided', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createCredential({ label: 'Production API' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.label).toBe('Production API');
  });

  it('includes ttl_days in request body when provided', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createCredential({ ttl_days: 365 });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.ttl_days).toBe(365);
  });

  it('includes ttl_days: 0 in request body (not dropped)', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createCredential({ ttl_days: 0 });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body).toHaveProperty('ttl_days');
    expect(body.ttl_days).toBe(0);
  });

  it('includes both label and ttl_days when provided', async () => {
    mockFetchOk(CREDENTIAL_CREATE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.createCredential({ label: 'Staging', ttl_days: 30 });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body.label).toBe('Staging');
    expect(body.ttl_days).toBe(30);
  });

  it('throws AgentScoreError on failure', async () => {
    mockFetchError(401, { error: { code: 'unauthorized', message: 'Invalid API key' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.createCredential()).rejects.toBeInstanceOf(AgentScoreError);
  });
});

// ---------------------------------------------------------------------------
// listCredentials
// ---------------------------------------------------------------------------

const CREDENTIAL_LIST_RESPONSE = {
  credentials: [
    {
      id: 'cred_abc123',
      prefix: 'opc_test_abc',
      label: 'Production API',
      expires_at: '2027-04-09T00:00:00Z',
      last_used_at: '2026-04-08T12:00:00Z',
      created_at: '2026-04-01T00:00:00Z',
    },
    {
      id: 'cred_def456',
      prefix: 'opc_test_def',
      label: 'Staging',
      expires_at: '2026-05-01T00:00:00Z',
      last_used_at: null,
      created_at: '2026-04-05T00:00:00Z',
    },
  ],
};

describe('AgentScore.listCredentials()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns credentials list on success', async () => {
    mockFetchOk(CREDENTIAL_LIST_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.listCredentials();
    expect(result.credentials).toHaveLength(2);
    expect(result.credentials[0].id).toBe('cred_abc123');
    expect(result.credentials[1].last_used_at).toBeNull();
  });

  it('sends GET request to /v1/credentials', async () => {
    mockFetchOk(CREDENTIAL_LIST_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.listCredentials();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toBe('https://api.agentscore.sh/v1/credentials');
    expect(call[1].method).toBeUndefined();
  });

  it('sends X-API-Key header', async () => {
    mockFetchOk(CREDENTIAL_LIST_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.listCredentials();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe(API_KEY);
  });

  it('returns empty list when no credentials exist', async () => {
    mockFetchOk({ credentials: [] });
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.listCredentials();
    expect(result.credentials).toHaveLength(0);
  });

  it('throws AgentScoreError on failure', async () => {
    mockFetchError(500, { error: { code: 'internal_error', message: 'Server error' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.listCredentials()).rejects.toBeInstanceOf(AgentScoreError);
  });
});

// ---------------------------------------------------------------------------
// revokeCredential
// ---------------------------------------------------------------------------

const CREDENTIAL_REVOKE_RESPONSE = {
  id: 'cred_abc123',
  revoked: true as const,
};

describe('AgentScore.revokeCredential()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns revoke confirmation on success', async () => {
    mockFetchOk(CREDENTIAL_REVOKE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.revokeCredential('cred_abc123');
    expect(result.id).toBe('cred_abc123');
    expect(result.revoked).toBe(true);
  });

  it('sends DELETE request to /v1/credentials/{id}', async () => {
    mockFetchOk(CREDENTIAL_REVOKE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.revokeCredential('cred_abc123');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.agentscore.sh/v1/credentials/cred_abc123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('sends X-API-Key header', async () => {
    mockFetchOk(CREDENTIAL_REVOKE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.revokeCredential('cred_abc123');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe(API_KEY);
  });

  it('encodes special characters in credential id', async () => {
    mockFetchOk(CREDENTIAL_REVOKE_RESPONSE);
    const client = new AgentScore({ apiKey: API_KEY });
    await client.revokeCredential('cred/special?id');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain(encodeURIComponent('cred/special?id'));
  });

  it('throws AgentScoreError on 404', async () => {
    mockFetchError(404, { error: { code: 'not_found', message: 'Credential not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.revokeCredential('cred_missing')).rejects.toBeInstanceOf(AgentScoreError);
  });

  it('AgentScoreError has correct code and status on failure', async () => {
    expect.assertions(3);
    mockFetchError(404, { error: { code: 'not_found', message: 'Credential not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    try {
      await client.revokeCredential('cred_missing');
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('not_found');
      expect(err.status).toBe(404);
    }
  });
});

// ---------------------------------------------------------------------------
// associateWallet
// ---------------------------------------------------------------------------

const ASSOCIATE_OPTIONS = {
  operatorToken: 'opc_' + 'a'.repeat(48),
  walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  network: 'evm' as const,
};

describe('AgentScore.associateWallet()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns { associated, first_seen } on success', async () => {
    mockFetchOk({ associated: true, first_seen: true });
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.associateWallet(ASSOCIATE_OPTIONS);
    expect(result).toEqual({ associated: true, first_seen: true });
  });

  it('sends a POST with snake_case body fields to /v1/credentials/wallets', async () => {
    mockFetchOk({ associated: true, first_seen: false });
    const client = new AgentScore({ apiKey: API_KEY });
    await client.associateWallet(ASSOCIATE_OPTIONS);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/v1/credentials/wallets');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body as string);
    expect(body).toEqual({
      operator_token: ASSOCIATE_OPTIONS.operatorToken,
      wallet_address: ASSOCIATE_OPTIONS.walletAddress,
      network: ASSOCIATE_OPTIONS.network,
    });
  });

  it('forwards idempotencyKey as snake_case idempotency_key in the body', async () => {
    mockFetchOk({ associated: true, first_seen: false, deduped: true });
    const client = new AgentScore({ apiKey: API_KEY });
    const result = await client.associateWallet({ ...ASSOCIATE_OPTIONS, idempotencyKey: 'pi_abc' });

    expect(result).toEqual({ associated: true, first_seen: false, deduped: true });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.idempotency_key).toBe('pi_abc');
  });

  it('omits idempotency_key entirely when not provided', async () => {
    mockFetchOk({ associated: true, first_seen: true });
    const client = new AgentScore({ apiKey: API_KEY });
    await client.associateWallet(ASSOCIATE_OPTIONS);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body).not.toHaveProperty('idempotency_key');
  });

  it('throws AgentScoreError on 401 invalid_credential (matches /v1/assess for anti-enumeration)', async () => {
    mockFetchError(401, { error: { code: 'invalid_credential', message: 'Operator credential not found' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.associateWallet(ASSOCIATE_OPTIONS)).rejects.toBeInstanceOf(AgentScoreError);
  });

  it('throws AgentScoreError with correct code on 400 invalid_wallet', async () => {
    expect.assertions(3);
    mockFetchError(400, { error: { code: 'invalid_wallet', message: 'bad wallet' } });
    const client = new AgentScore({ apiKey: API_KEY });
    try {
      await client.associateWallet({ ...ASSOCIATE_OPTIONS, walletAddress: '0xnope' });
    } catch (e) {
      expect(e).toBeInstanceOf(AgentScoreError);
      const err = e as AgentScoreError;
      expect(err.code).toBe('invalid_wallet');
      expect(err.status).toBe(400);
    }
  });

  it('throws AgentScoreError on 402 payment_required', async () => {
    mockFetchError(402, { error: { code: 'payment_required', message: 'endpoint not enabled' } });
    const client = new AgentScore({ apiKey: API_KEY });
    await expect(client.associateWallet(ASSOCIATE_OPTIONS)).rejects.toBeInstanceOf(AgentScoreError);
  });
});
