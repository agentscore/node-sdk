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
  /** Wallets linked to the same operator as the resolved identity. Populated on allow
   *  responses; omitted on denials to avoid leaking the linked set for flagged operators.
   *  Returned regardless of identity_method so agents can enumerate all wallets they could
   *  sign with to satisfy a wallet-auth claim. Capped at 100 entries. */
  linked_wallets?: string[];
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
  /** Cross-merchant pattern hint for agents to persist to memory. Present on bootstrap
   *  denials (`operator_verification_required`) and session-create responses. */
  agent_memory?: AgentMemoryHint;
  /** JSON-encoded action copy (`{action, steps, user_message}`) emitted on every
   *  gate denial so agents see a concrete recovery path in the response itself. Parse
   *  as JSON; `action` will be a `NextStepsAction`. Absent on plain API errors. */
  agent_instructions?: string;
}

/**
 * Denial codes returned by the gate in 403/402 error bodies.
 *
 *   - `wallet_signer_mismatch`: X-Wallet-Address claimed, but the payment signer resolves to a
 *     different operator (or isn't linked to any operator).
 *   - `wallet_auth_requires_wallet_signing`: X-Wallet-Address claimed with a payment rail that
 *     has no wallet signer (SPT, card). Agent should switch to X-Operator-Token.
 *   - `token_expired`: operator token is no longer valid (revoked or past its TTL —
 *     the two cases share this code deliberately so the API doesn't leak which one).
 *     The 401 body carries an auto-minted session (`verify_url`, `session_id`, `poll_secret`)
 *     so the agent can recover without an API key: share `verify_url` with the user, poll
 *     until verified, receive a fresh operator_token. Existing account KYC persists.
 */
export type DenialCode =
  | 'operator_verification_required'
  | 'compliance_denied'
  | 'compliance_error'
  | 'wallet_not_trusted'
  | 'missing_identity'
  | 'identity_verification_required'
  | 'payment_required'
  | 'api_error'
  | 'kyc_required'
  | 'wallet_signer_mismatch'
  | 'wallet_auth_requires_wallet_signing'
  | 'token_expired';

/**
 * Recommended agent action encoded in `next_steps.action`. Granular codes let agents pick the
 * right remediation (mint new credential vs. re-verify vs. switch identity path) without
 * parsing natural-language `user_message`.
 */
export type NextStepsAction =
  | 'poll_for_credential'
  | 'contact_support'
  | 'retry'
  | 'retry_once_then_contact_support'
  | 'regenerate_payment_credential'
  | 'none'
  | 'done'
  | 'use_operator_token'
  | 'regenerate_payment_from_linked_wallet'
  // Gate-emitted probe strategy: try wallet on signing rails, fall back to stored
  // opc_..., fall back to session flow. Emitted on bare missing_identity 403s.
  | 'probe_identity_then_session'
  // Wallet signer mismatch: re-sign from expected_signer / any linked_wallets entry,
  // or drop X-Wallet-Address and retry with X-Operator-Token.
  | 'resign_or_switch_to_operator_token'
  // Non-signing rail (Stripe SPT, card): X-Wallet-Address has no signature to verify.
  // Drop the wallet header and use X-Operator-Token.
  | 'switch_to_operator_token'
  // Session creation success — deliver verify_url to the user and poll poll_url until
  // operator_token issues. Emitted on POST /v1/sessions.
  | 'deliver_verify_url_and_poll'
  // Session poll states.
  | 'continue_polling'
  | 'retry_merchant_request_with_operator_token'
  | 'use_stored_operator_token'
  | 'create_new_session'
  | 'verification_failed'
  | 'complete_kyc_then_retry';

/**
 * Error body shape for `wallet_signer_mismatch` denials. The claimed wallet's operator
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
  /** JSON-encoded `{action: 'resign_or_switch_to_operator_token', steps, user_message}`.
   *  Present when the merchant uses the gate's default denial marshaller. Merchants that
   *  override with their own `next_steps` may emit that instead — parse whichever is present. */
  agent_instructions?: string;
  /** Structured action guidance. Present when the merchant overrides the gate default with
   *  a custom `next_steps`. `action` may be any `NextStepsAction` — typically
   *  `resign_or_switch_to_operator_token` (gate default) or
   *  `regenerate_payment_from_linked_wallet` (a merchant-emitted alternative). */
  next_steps?: {
    action: NextStepsAction;
    user_message?: string;
    learn_more_url?: string;
  };
  agent_memory?: AgentMemoryHint;
}

/**
 * Error body for `wallet_auth_requires_wallet_signing` denials. Fired when
 * `X-Wallet-Address` is combined with a payment rail that has no wallet signer (SPT, card).
 * The agent should switch to `X-Operator-Token` to use those rails.
 */
export interface WalletAuthRequiresSigningBody {
  error: {
    code: 'wallet_auth_requires_wallet_signing';
    message: string;
  };
  /** JSON-encoded `{action: 'switch_to_operator_token', steps, user_message}`. Present when
   *  the merchant uses the gate's default denial marshaller. */
  agent_instructions?: string;
  /** Structured action guidance. Present when the merchant overrides the gate default.
   *  `action` is typically `switch_to_operator_token` (gate default) or `use_operator_token`
   *  (a merchant-emitted alternative). */
  next_steps?: {
    action: NextStepsAction;
    user_message?: string;
    /** Rails that carry a wallet signature and can be used under wallet-auth. */
    signer_capable_rails?: string[];
    learn_more_url?: string;
  };
  agent_memory?: AgentMemoryHint;
}

/**
 * Identity-path guidance in the agent_memory payload. Tells agents which header to send on
 * future AgentScore-gated endpoints based on the payment rail they plan to use.
 */
export interface AgentMemoryIdentityPaths {
  wallet: string;
  operator_token: string;
}

/**
 * Structured hint emitted by AgentScore-gated endpoints on bootstrap denials
 * (`operator_verification_required`) and `POST /v1/sessions` success responses. LLM-hosted
 * agents should save this to their long-term memory so future AgentScore encounters skip the
 * cold-start session flow.
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
  /** Structured `next_steps.action: 'deliver_verify_url_and_poll'` with step-by-step
   *  instructions for consuming the session. */
  next_steps?: {
    action: NextStepsAction;
    poll_interval_seconds?: number;
    poll_secret_header?: string;
    steps?: string[];
    user_message?: string;
  };
  /** Cross-merchant memory hint for agents on first session creation. */
  agent_memory?: AgentMemoryHint;
}

export interface SessionPollNextSteps {
  action: NextStepsAction;
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
  label: string | null;
  expires_at: string;
  created_at: string;
  agent_memory?: AgentMemoryHint;
}

export interface CredentialCreateErrorResponse {
  error: {
    code: 'kyc_required';
    message: string;
  };
  verify_url: string;
  next_steps: {
    action: NextStepsAction;
    user_message: string;
  };
}

export interface CredentialListItem {
  id: string;
  prefix: string;
  label: string | null;
  expires_at: string | null;
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
  /** Cross-merchant pattern hint. Emitted only on the first wallet capture (`first_seen: true`)
   *  so merchants can relay it once in a 402 body and LLM-hosted agents persist the pattern
   *  to long-term memory. Absent on all subsequent captures. */
  agent_memory?: AgentMemoryHint;
}
