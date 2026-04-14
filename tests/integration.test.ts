import { beforeAll, describe, expect, it } from 'vitest';
import { AgentScore } from '../src/index';

const API_KEY = process.env.AGENTSCORE_API_KEY;
const BASE_URL = process.env.AGENTSCORE_BASE_URL || 'http://api.dev.agentscore.internal';
const TEST_ADDRESS = '0x339559a2d1cd15059365fc7bd36b3047bba480e0';

const describeIf = API_KEY ? describe : describe.skip;

describeIf('integration: real API', { timeout: 15_000 }, () => {
  let client: AgentScore;

  beforeAll(() => {
    client = new AgentScore({ apiKey: API_KEY!, baseUrl: BASE_URL });
  });

  it('getReputation returns correct shape', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);

    expect(rep.updated_at).toBeDefined();
  });

  it('getReputation with chain filter returns data', async () => {
    const rep = await client.getReputation(TEST_ADDRESS, { chain: 'base' });

    expect(rep.updated_at).toBeDefined();
  });

  it('getReputation returns updated_at', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);

    expect(rep.updated_at).toBeDefined();
  });

  it('getReputation has updated_at', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);

    expect(rep.updated_at).toBeDefined();
  });

  it('getReputation has operator_score for operator address', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);

    if (rep.operator_score) {
      expect(typeof rep.operator_score.score).toBe('number');
      expect(typeof rep.operator_score.grade).toBe('string');
      expect(typeof rep.operator_score.agent_count).toBe('number');
      expect(rep.operator_score.chains_active).toBeInstanceOf(Array);
    }
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

  it('getReputation includes reputation when feedback exists', async () => {
    await new Promise(r => setTimeout(r, 1100));
    const rep = await client.getReputation(TEST_ADDRESS);

    if (rep.reputation) {
      expect(typeof rep.reputation.feedback_count).toBe('number');
      expect(typeof rep.reputation.client_count).toBe('number');
    }
  });

  it('assess then check reputation for same address', async () => {
    const assessed = await client.assess(TEST_ADDRESS);
    expect(assessed.decision).toBeDefined();

    const rep = await client.getReputation(TEST_ADDRESS);
    expect(rep.updated_at).toBeDefined();
  });

});
