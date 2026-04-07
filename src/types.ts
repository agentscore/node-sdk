export interface AgentScoreConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type EntityType = 'agent' | 'service' | 'hybrid' | 'wallet' | 'bot' | 'unknown';
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
  claimed_at?: string | null;
  verified_at?: string | null;
}

export interface DecisionPolicy {
  min_grade?: Grade;
  min_score?: number;
  require_verified_payment_activity?: boolean;
  require_kyc?: boolean;
  require_sanctions_clear?: boolean;
  min_age?: number;
  blocked_jurisdictions?: string[];
  require_entity_type?: string;
}

export interface AssessRequest {
  address: string;
  chain?: string;
  refresh?: boolean;
  policy?: DecisionPolicy;
}

export interface AssessResponse {
  subject: Subject;
  score: Score;
  chains: ChainEntry[];
  decision: string | null;
  decision_reasons: string[];
  on_the_fly: boolean;
  data_semantics: string;
  caveats: string[];
  updated_at: string | null;
  operator_score?: OperatorScore;
  reputation?: Reputation;
  agents?: AgentSummary[];
  operator_verification?: OperatorVerification;
  resolved_operator?: string;
  verify_url?: string;
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
}
