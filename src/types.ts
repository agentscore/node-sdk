export interface AgentScoreConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  /** Prepended to the default User-Agent as `"{userAgent} (agentscore-sdk/{version})"`. Use to attribute API calls to your app. */
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
}

export interface SessionPollNextSteps {
  action: string;
  user_message?: string;
  header_name?: string;
  poll_interval_seconds?: number;
  eta_message?: string;
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
