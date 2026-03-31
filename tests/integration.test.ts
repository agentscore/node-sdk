import { describe, expect, it } from 'vitest';
import { AgentScore } from '../src/index';

const API_KEY = process.env.AGENTSCORE_API_KEY;
const BASE_URL = process.env.AGENTSCORE_BASE_URL || 'http://api.dev.agentscore.internal';
const TEST_ADDRESS = '0x339559a2d1cd15059365fc7bd36b3047bba480e0';

const describeIf = API_KEY ? describe : describe.skip;

describeIf('integration: real API', () => {
  const client = new AgentScore({ apiKey: API_KEY!, baseUrl: BASE_URL });

  it('getReputation returns correct shape', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);

    expect(rep.subject).toBeDefined();
    expect(rep.subject.chains).toBeInstanceOf(Array);
    expect(rep.subject.chains.length).toBeGreaterThan(0);
    expect(rep.subject.address).toBeDefined();

    expect(rep.score).toBeDefined();
    expect(typeof rep.score.value).toBe('number');
    expect(typeof rep.score.grade).toBe('string');
    expect(rep.score.scored_at).toBeDefined();
    expect(rep.score.status).toBeDefined();
    expect(rep.score.version).toBeDefined();
    expect((rep.score as Record<string, unknown>).confidence).toBeUndefined();
    expect((rep.score as Record<string, unknown>).dimensions).toBeUndefined();

    expect(rep.chains).toBeInstanceOf(Array);
    expect(rep.chains.length).toBeGreaterThan(0);

    const chain = rep.chains[0]!;
    expect(chain.chain).toBeDefined();
    expect(chain.score).toBeDefined();
    expect(chain.score.value).toBeDefined();
    expect(chain.score.grade).toBeDefined();
    expect(chain.classification).toBeDefined();
    expect(chain.classification.entity_type).toBeDefined();
    expect(chain.identity).toBeDefined();
    expect(chain.activity).toBeDefined();
    expect(chain.evidence_summary).toBeDefined();

    expect(rep.agents).toBeInstanceOf(Array);
  });

  it('getReputation with chain filter returns single chain', async () => {
    const rep = await client.getReputation(TEST_ADDRESS, { chain: 'base' });

    expect(rep.subject.chains).toEqual(['base']);
    expect(rep.chains).toHaveLength(1);
    expect(rep.chains[0]!.chain).toBe('base');
  });

  it('getReputation chain entry has full score and activity', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);
    const chain = rep.chains[0]!;

    expect(chain.score.confidence).toBeDefined();
    expect(chain.score.dimensions).toBeDefined();
    expect(chain.activity.total_candidate_transactions).toBeDefined();
    expect(chain.activity.as_verified_payer).toBeDefined();
    expect(chain.activity.active_days).toBeDefined();
    expect(chain.activity.first_candidate_tx_at).toBeDefined();
  });

  it('getReputation has caveats, data_semantics, updated_at', async () => {
    const rep = await client.getReputation(TEST_ADDRESS);

    expect(rep.caveats).toBeInstanceOf(Array);
    expect(rep.data_semantics).toBeDefined();
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
    expect(result.score.value).toBeDefined();
    expect(result.score.grade).toBeDefined();
    expect(result.chains).toBeInstanceOf(Array);
    expect(result.agents).toBeInstanceOf(Array);
    expect((result as Record<string, unknown>).classification).toBeUndefined();
  });

  it('assess with policy can deny', async () => {
    const result = await client.assess(TEST_ADDRESS, {
      policy: { min_score: 999 },
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
});
