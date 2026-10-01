import { beforeAll, describe, expect, it } from 'vitest';
import { AgentScore } from '../src/index';

const API_KEY = process.env.AGENTSCORE_API_KEY;
const BASE_URL = process.env.AGENTSCORE_BASE_URL;
const TEST_ADDRESS = '0x339559a2d1cd15059365fc7bd36b3047bba480e0';

// Both must be set for integration tests to run — no default to a private endpoint.
const describeIf = (API_KEY && BASE_URL) ? describe : describe.skip;

describeIf('integration: real API', { timeout: 15_000 }, () => {
  let client: AgentScore;

  beforeAll(() => {
    client = new AgentScore({ apiKey: API_KEY!, baseUrl: BASE_URL });
  });

  it('assess returns operator-level decision', async () => {
    const result = await client.assess(TEST_ADDRESS);

    expect(result.decision).toBeDefined();
    expect(result.decision_reasons).toBeInstanceOf(Array);
    expect((result as Record<string, unknown>).classification).toBeUndefined();
  });

  it('assess with policy can deny', async () => {
    const result = await client.assess(TEST_ADDRESS, {
      policy: { require_kyc: true },
    });

    expect(result.decision).toBe('deny');
    expect(result.decision_reasons.length).toBeGreaterThan(0);
  });

});
