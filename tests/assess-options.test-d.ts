import { describe, it } from 'vitest';
import { AgentScore } from '../src/index';
import type { AipSignatureMaterial, AssessOptions } from '../src/index';

// Compile-time checks for the AIP proof-of-possession pairing on AssessOptions:
// `aipToken` and `aipSignature` are required together. Never executed at runtime —
// vitest's typecheck runner verifies this file with tsc, including that every
// ts-expect-error directive below sits above a genuine type error.

declare const client: AgentScore;
declare const material: AipSignatureMaterial;

describe('AssessOptions — AIP PoP pairing (type-level)', () => {
  it('accepts the aipToken + aipSignature pair', () => {
    void client.assess(null, { aipToken: 'eyJ.ait', aipSignature: material });
    void client.assess('0xabc', { aipToken: 'eyJ.ait', aipSignature: material });
    const options: AssessOptions = { aipToken: 'eyJ.ait', aipSignature: material, policy: { require_kyc: true } };
    void options;
  });

  it('accepts options without either AIP field', () => {
    void client.assess('0xabc', { chain: 'base', refresh: true });
    void client.assess(null, { operatorToken: 'opc_123' });
  });

  it('rejects aipToken without aipSignature', () => {
    // @ts-expect-error — aipToken requires its RFC 9421 PoP material; the API rejects a bare AIT with 400
    void client.assess('0xabc', { aipToken: 'eyJ.ait' });
    // @ts-expect-error — same pairing rule on the bare options type
    const options: AssessOptions = { aipToken: 'eyJ.ait' };
    void options;
  });

  it('rejects aipSignature without aipToken', () => {
    // @ts-expect-error — PoP material is meaningless without the AIT it proves possession of
    void client.assess('0xabc', { aipSignature: material });
  });
});
