import { describe, expect, it } from 'vitest';
import type {
  AgentMemoryHint,
  AgentScoreErrorBody,
  DenialCode,
  NextStepsAction,
  SessionCreateResponse,
  WalletAuthRequiresSigningBody,
  WalletSignerMismatchBody,
} from '../src/index';

// Compile-time type-presence checks for the denial-code, memory-hint, and wallet-signer
// body types. Runtime assertions exist only to give vitest something to execute; the real
// verification is that the file type-checks.

describe('1.9.0 types', () => {
  it('accepts all new DenialCode values', () => {
    const codes: DenialCode[] = [
      'operator_verification_required',
      'compliance_denied',
      'wallet_signer_mismatch',
      'wallet_auth_requires_wallet_signing',
      'token_expired',
    ];
    expect(codes).toHaveLength(5);
  });

  it('accepts all new NextStepsAction values', () => {
    const actions: NextStepsAction[] = [
      // Probe strategy (gate-emitted missing_identity).
      'probe_identity_then_session',
      'resign_or_switch_to_operator_token',
      'switch_to_operator_token',
      'deliver_verify_url_and_poll',
      // Session poll states.
      'continue_polling',
      'retry_merchant_request_with_operator_token',
      'use_stored_operator_token',
      // Backward-compat: pre-1.9.0 actions still present.
      'mint_new_credential',
      'use_operator_token',
      'regenerate_payment_from_linked_wallet',
      'poll_for_credential',
      'contact_support',
    ];
    expect(actions).toHaveLength(12);
  });

  it('WalletSignerMismatchBody shape', () => {
    const body: WalletSignerMismatchBody = {
      error: { code: 'wallet_signer_mismatch', message: 'signer does not match claimed wallet' },
      claimed_operator: 'op_abc',
      actual_signer_operator: null,
      expected_signer: '0x1111',
      actual_signer: '0x2222',
      linked_wallets: ['0x1111', '0x3333'],
      next_steps: {
        action: 'regenerate_payment_from_linked_wallet',
        user_message: 'sign with one of the linked wallets',
      },
    };
    expect(body.error.code).toBe('wallet_signer_mismatch');
    expect(body.linked_wallets).toHaveLength(2);
  });

  it('WalletAuthRequiresSigningBody shape', () => {
    const body: WalletAuthRequiresSigningBody = {
      error: { code: 'wallet_auth_requires_wallet_signing', message: 'SPT has no wallet signer' },
      next_steps: {
        action: 'use_operator_token',
        signer_capable_rails: ['tempo', 'x402'],
      },
    };
    expect(body.error.code).toBe('wallet_auth_requires_wallet_signing');
    expect(body.next_steps.signer_capable_rails).toContain('tempo');
  });

  it('AgentMemoryHint shape', () => {
    const memory: AgentMemoryHint = {
      save_for_future_agentscore_gates: true,
      pattern_summary: 'AgentScore is a cross-merchant identity layer',
      quickstart: 'https://docs.agentscore.sh/agent-commerce-quickstart',
      identity_check_endpoint: 'https://api.agentscore.sh/v1/credentials',
      list_wallets_endpoint: 'https://api.agentscore.sh/v1/credentials/wallets',
      identity_paths: {
        wallet: 'send X-Wallet-Address when paying from a linked wallet',
        operator_token: 'send X-Operator-Token for any rail',
      },
      bootstrap: 'follow the session/verify flow if you have neither',
      do_not_persist_in_memory: ['operator_token', 'poll_secret'],
      persist_in_credential_store: ['operator_token'],
    };
    expect(memory.save_for_future_agentscore_gates).toBe(true);
    expect(memory.identity_paths.wallet).toContain('X-Wallet-Address');
  });

  it('AgentScoreErrorBody accepts optional agent_memory', () => {
    const body: AgentScoreErrorBody = {
      error: { code: 'operator_verification_required', message: 'identity required' },
      agent_memory: {
        save_for_future_agentscore_gates: true,
        pattern_summary: 'p',
        quickstart: 'q',
        identity_check_endpoint: 'e',
        identity_paths: { wallet: 'w', operator_token: 'ot' },
        bootstrap: 'b',
        do_not_persist_in_memory: [],
        persist_in_credential_store: [],
      },
    };
    expect(body.agent_memory?.save_for_future_agentscore_gates).toBe(true);
  });

  it('SessionCreateResponse accepts optional agent_memory', () => {
    const res: SessionCreateResponse = {
      session_id: 'sess_abc',
      poll_secret: 'poll_abc',
      verify_url: 'https://agentscore.sh/verify?session=sess_abc',
      poll_url: 'https://api.agentscore.sh/v1/sessions/sess_abc',
      expires_at: '2026-04-24T00:00:00Z',
      agent_memory: {
        save_for_future_agentscore_gates: true,
        pattern_summary: 'p',
        quickstart: 'q',
        identity_check_endpoint: 'e',
        identity_paths: { wallet: 'w', operator_token: 'ot' },
        bootstrap: 'b',
        do_not_persist_in_memory: [],
        persist_in_credential_store: [],
      },
    };
    expect(res.agent_memory).toBeDefined();
  });
});
