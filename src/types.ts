export interface AgentScoreConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  /** Prepended to the default User-Agent as `"{userAgent} (@agent-score/sdk@{version})"`. Use to attribute API calls to your app. */
  userAgent?: string;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type EntityType = 'agent' | 'service' | 'hybrid' | 'wallet' | 'bot' | 'unknown' | 'individual' | 'entity';
export type ReputationStatus = 'scored' | 'stale' | 'known_unscored';

export interface Subject {
  chains: string[];
  address: string;
}

export interface Classification {
  entity_type: EntityType;
  confidence: number | null;
  is_known: boolean;
  is_known_erc8004_agent: boolean;
  has_candidate_payment_activity: boolean;
  has_verified_payment_activity: boolean;
  reasons: string[];
}

export interface Score {
  value: number | null;
  grade: Grade | null;
  scored_at: string | null;
  status: ReputationStatus;
  version: string;
}

export interface ChainScore {
  value: number | null;
  grade: Grade | null;
  confidence?: number | null;
  dimensions?: Record<string, number> | null;
  scored_at: string | null;
  status: ReputationStatus;
  version: string;
}

export interface Identity {
  ens_name: string | null;
  website_url: string | null;
  github_url: string | null;
}

export interface Activity {
  total_candidate_transactions: number;
  total_verified_transactions: number;
  as_candidate_payer: number;
  as_candidate_payee: number;
  as_verified_payer: number;
  as_verified_payee: number;
  counterparties_count: number;
  active_days: number;
  active_months: number;
  first_candidate_tx_at: string | null;
  last_candidate_tx_at: string | null;
  first_verified_tx_at: string | null;
  last_verified_tx_at: string | null;
}

export interface EvidenceSummary {
  metadata_kind: string | null;
  has_a2a_agent_card: boolean;
  website_url: string | null;
  website_reachable: boolean;
  website_mentions_mcp: boolean;
  website_mentions_x402: boolean;
  github_url: string | null;
  github_stars: number | null;
}

export interface Reputation {
  feedback_count: number;
  client_count: number;
  trust_avg: number | null;
  uptime_avg: number | null;
  activity_avg: number | null;
  last_feedback_at: string | null;
}

export interface OperatorScore {
  score: number;
  grade: Grade;
  agent_count?: number;
  chains_active?: string[];
}

export interface AgentSummary {
  token_id: number;
  chain: string;
  name: string | null;
  score: number;
  grade: Grade;
}

export interface RedactedClassification {
  entity_type: EntityType;
}

export interface ChainEntry {
  chain: string;
  score: ChainScore;
  classification: Classification | RedactedClassification;
  identity?: Identity;
  activity?: Activity;
  evidence_summary?: EvidenceSummary;
}

export interface ReputationResponse {
  subject: Subject;
  score: Score;
  chains: ChainEntry[];
  data_semantics: string;
  caveats: string[];
  updated_at: string | null;
  reputation?: Reputation;
  operator_score?: OperatorScore;
  agents?: AgentSummary[];
  verification_level?: VerificationLevel;
}

export type VerificationLevel = 'none' | 'wallet_claimed' | 'kyc_verified';

export interface OperatorVerification {
  level: VerificationLevel;
  operator_type?: string | null;
  verified_at?: string | null;
}

export interface DecisionPolicy {
  require_kyc?: boolean;
  require_sanctions_clear?: boolean;
  min_age?: number;
  blocked_jurisdictions?: string[];
  allowed_jurisdictions?: string[];
}

export interface AssessRequest {
  address: string;
  chain?: string;
  refresh?: boolean;
  policy?: DecisionPolicy;
}

export interface AssessResponse {
  decision: string | null;
  decision_reasons: string[];
  identity_method: 'wallet' | 'operator_token';
  operator_verification?: OperatorVerification;
  resolved_operator?: string | null;
  verify_url?: string;
  policy_result?: {
    all_passed: boolean;
    checks: Array<{
      rule: string;
      passed: boolean;
      required?: unknown;
      actual?: unknown;
    }>;
  } | null;
  on_the_fly: boolean;
  updated_at: string | null;
  explanation?: Array<{
    rule: string;
    passed: boolean;
    required: unknown;
    actual: unknown;
    message: string;
    how_to_remedy: string | null;
  }>;
}

export interface AgentScoreErrorBody {
  error: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
  /** Cross-merchant pattern hint for agents to persist to memory (TEC-227). Present on bootstrap
   *  denials (`operator_verification_required`) and session-create responses. */
  agent_memory?: AgentMemoryHint;
}

/**
 * Denial codes returned by the gate in 403/402 error bodies. Additive — old codes retained for
 * backward compat.
 *
 * New in 1.9.0:
 *   - `wallet_signer_mismatch`: X-Wallet-Address claimed, but the payment signer resolves to a
 *     different operator (or isn't linked to any operator). TEC-226.
 *   - `wallet_auth_requires_wallet_signing`: X-Wallet-Address claimed with a payment rail that
 *     has no wallet signer (SPT, card). Agent should switch to X-Operator-Token. TEC-226.
 *   - `token_expired`: operator token valid-shape but past its TTL. Agent should mint a new
 *     credential via POST /v1/credentials, no re-KYC needed. TEC-218.
 *   - `token_revoked`: operator token was revoked. Agent should stop and surface to user. TEC-218.
 */
export type DenialCode =
  // Pre-1.9.0
  | 'operator_verification_required'
  | 'compliance_denied'
  | 'compliance_error'
  | 'wallet_not_trusted'
  | 'missing_identity'
  | 'identity_verification_required'
  | 'payment_required'
  | 'api_error'
  | 'kyc_required'
  // Added in 1.9.0
  | 'wallet_signer_mismatch'
  | 'wallet_auth_requires_wallet_signing'
  | 'token_expired'
  | 'token_revoked';

/**
 * Recommended agent action encoded in `next_steps.action`. Granular codes added in 1.9.0 (TEC-218)
 * let agents pick the right remediation (mint new credential vs. re-verify vs. switch identity
 * path) without parsing natural-language `user_message`.
 */
export type NextStepsAction =
  // Pre-1.9.0
  | 'poll_for_credential'
  | 'contact_support'
  | 'retry'
  | 'retry_once_then_contact_support'
  | 'regenerate_payment_credential'
  | 'none'
  | 'done'
  // Added in 1.9.0
  | 'send_existing_identity'
  | 'mint_new_credential'
  | 'use_operator_token'
  | 'regenerate_payment_from_linked_wallet';

/**
 * Error body shape for `wallet_signer_mismatch` denials (TEC-226). The claimed wallet's operator
 * doesn't match the signer's operator. `actual_signer_operator` is null when the signer isn't
 * linked to any operator (treat as a different identity). `linked_wallets` lists the wallets the
 * agent could sign with to satisfy the claim.
 */
export interface WalletSignerMismatchBody {
  error: {
    code: 'wallet_signer_mismatch';
    message: string;
  };
  claimed_operator: string;
  actual_signer_operator: string | null;
  expected_signer?: string;
  actual_signer?: string;
  linked_wallets: string[];
  next_steps: {
    action: 'regenerate_payment_from_linked_wallet';
    user_message?: string;
    learn_more_url?: string;
  };
  agent_memory?: AgentMemoryHint;
}

/**
 * Error body for `wallet_auth_requires_wallet_signing` denials (TEC-226). Fired when
 * `X-Wallet-Address` is combined with a payment rail that has no wallet signer (SPT, card).
 * The agent should switch to `X-Operator-Token` to use those rails.
 */
export interface WalletAuthRequiresSigningBody {
  error: {
    code: 'wallet_auth_requires_wallet_signing';
    message: string;
  };
  next_steps: {
    action: 'use_operator_token';
    user_message?: string;
    /** Rails that carry a wallet signature and can be used under wallet-auth. */
    signer_capable_rails?: string[];
    learn_more_url?: string;
  };
  agent_memory?: AgentMemoryHint;
}

/**
 * Identity-path guidance in the agent_memory payload (TEC-227). Tells agents which header to send
 * on future AgentScore-gated endpoints based on the payment rail they plan to use.
 */
export interface AgentMemoryIdentityPaths {
  wallet: string;
  operator_token: string;
}

/**
 * Structured hint emitted by AgentScore-gated endpoints on bootstrap denials
 * (`operator_verification_required`) and `POST /v1/sessions` success responses (TEC-227).
 * LLM-hosted agents should save this to their long-term memory so future AgentScore encounters
 * skip the cold-start session flow.
 *
 * Contents are the pattern, not secrets. `do_not_persist_in_memory` names bearer credentials
 * that belong in a credential store, not an LLM memory.
 */
export interface AgentMemoryHint {
  save_for_future_agentscore_gates: true;
  pattern_summary: string;
  quickstart: string;
  identity_check_endpoint: string;
  list_wallets_endpoint?: string;
  identity_paths: AgentMemoryIdentityPaths;
  bootstrap: string;
  do_not_persist_in_memory: string[];
  persist_in_credential_store: string[];
}

export interface GetReputationOptions {
  chain?: string;
}

export interface AssessOptions {
  chain?: string;
  refresh?: boolean;
  policy?: DecisionPolicy;
  operatorToken?: string;
}

export interface SessionCreateOptions {
  context?: string;
  product_name?: string;
}

export interface SessionCreateResponse {
  session_id: string;
  poll_secret: string;
  verify_url: string;
  poll_url: string;
  expires_at: string;
  /** Cross-merchant memory hint for agents on first session creation (TEC-227). */
  agent_memory?: AgentMemoryHint;
}

export interface SessionPollNextSteps {
  action: string;
  user_message?: string;
  header_name?: string;
  poll_interval_seconds?: number;
  eta_message?: string;
  /** Present when `action === 'contact_support'` (e.g. sanctions `flagged` status). */
  support_email?: string;
  /** Suggested subject line for the support email. */
  support_subject?: string;
}

export interface SessionPollResponse {
  session_id: string;
  status: string;
  operator_token?: string;
  completed_at?: string;
  next_steps?: SessionPollNextSteps;
  retry_after_seconds?: number;
  token_ttl_seconds?: number;
}

export interface CredentialCreateOptions {
  label?: string;
  ttl_days?: number;
}

export interface CredentialCreateResponse {
  id: string;
  credential: string;
  prefix: string;
  label: string;
  expires_at: string;
  created_at: string;
}

export interface CredentialCreateErrorResponse {
  error: {
    code: 'kyc_required';
    message: string;
  };
  verify_url: string;
  next_steps: {
    action: string;
    user_message: string;
  };
}

export interface CredentialListItem {
  id: string;
  prefix: string;
  label: string;
  expires_at: string;
  last_used_at: string | null;
  created_at: string;
}

export interface AccountVerification {
  kyc_status: string;
  kyc_verified_at?: string | null;
  jurisdiction?: string | null;
  age_verified?: boolean;
  age_bracket?: string | null;
  sanctions_status?: string | null;
  operator_type?: string | null;
}

export interface CredentialListResponse {
  credentials: CredentialListItem[];
  account_verification: AccountVerification;
}

export interface CredentialRevokeResponse {
  id: string;
  revoked: true;
}

export interface AssociateWalletOptions {
  /** Operator credential (opc_...) that the agent authenticated with on the gated endpoint. */
  operatorToken: string;
  /** The signer wallet recovered from the payment payload — EVM `from` from EIP-3009 for x402,
   *  the `did:pkh` address for Tempo MPP, or a Solana base58 pubkey. */
  walletAddress: string;
  /** Key-derivation family. EVM EOAs share identity across every EVM chain (Base, Tempo,
   *  Ethereum, …) so `"evm"` covers them all. Use `"solana"` for Solana addresses. */
  network: 'evm' | 'solana';
  /** Optional stable key for the logical payment (e.g., Stripe PI id, x402 tx hash). When the
   *  same key is seen again for the same (credential, wallet, network), the server no-ops —
   *  `transaction_count` isn't inflated by agent retries. */
  idempotencyKey?: string;
}

export interface AssociateWalletResponse {
  associated: true;
  /** True if this credential↔wallet pairing was seen for the first time. False if the row already existed. */
  first_seen: boolean;
  /** Present and `true` when the call was deduped against a prior matching `idempotency_key`. */
  deduped?: boolean;
}
