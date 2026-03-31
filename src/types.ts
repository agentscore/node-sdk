export interface AgentScoreConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type EntityType = 'agent' | 'service' | 'hybrid' | 'wallet' | 'bot' | 'unknown';
export type ReputationStatus = 'unknown' | 'known_unscored' | 'scored' | 'stale' | 'indexing';

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
  confidence: number | null;
  dimensions: Record<string, number> | null;
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
  candidate_tx_count?: number;
  confirmed_or_likely_tx?: number;
  endpoint_count?: number;
  github_stars?: number | null;
  github_url?: string | null;
  has_a2a_agent_card?: boolean;
  has_ens?: boolean;
  has_github?: boolean;
  has_website?: boolean;
  healthy_endpoints?: number;
  is_erc8004?: boolean;
  metadata_kind?: string | null;
  metadata_quality?: string | null;
  multi_chain_count?: number;
  reputation_feedback_count?: number;
  reputation_trust_avg?: number | null;
  reputation_uptime_avg?: number | null;
  reputation_activity_avg?: number | null;
  reputation_client_count?: number;
  verified_tx_count?: number;
  website_mentions_mcp?: boolean;
  website_mentions_x402?: boolean;
  website_reachable?: boolean;
  website_url?: string | null;
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
  agent_count: number;
  chains_active: string[];
}

export interface AgentSummary {
  token_id: number;
  chain: string;
  name: string | null;
  score: number;
  grade: Grade;
}

export interface ChainEntry {
  chain: string;
  score: ChainScore;
  classification: Classification;
  identity: Identity;
  activity: Activity;
  evidence_summary: EvidenceSummary;
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
}

export interface DecisionPolicy {
  min_grade?: Grade;
  min_score?: number;
  require_verified_payment_activity?: boolean;
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
}

export interface AgentRecord {
  chain: string;
  token_id: number;
  owner_address: string;
  agent_wallet: string | null;
  name: string | null;
  description: string | null;
  metadata_quality: string;
  score: number | null;
  grade: Grade | null;
  entity_type: EntityType | null;
  endpoint_count: number;
  website_url: string | null;
  github_url: string | null;
  has_candidate_payment_activity: boolean;
  has_verified_payment_activity: boolean;
  agents_sharing_owner?: number;
  updated_at: string;
}

export interface AgentsListResponse {
  items: AgentRecord[];
  next_cursor: string | null;
  count: number;
  version: string;
}

export interface StatsPayments {
  addresses_with_candidate_payment_activity: number;
  addresses_with_verified_payment_activity: number;
  total_candidate_transactions: number;
  total_verified_transactions: number;
  verification_status_summary: Record<string, number>;
}

export interface StatsResponse {
  version: string;
  as_of_time: string;
  data_semantics: string;
  erc8004?: {
    known_agents: number;
    by_chain: Record<string, number>;
    metadata_quality_distribution: Record<string, number>;
  };
  reputation?: {
    total_addresses: number;
    scored_addresses: number;
    entity_distribution: Record<string, number>;
    score_distribution: Record<string, number>;
  };
  payments: StatsPayments;
  caveats: string[];
}

export interface AgentScoreErrorBody {
  error: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
}

export interface GetAgentsOptions {
  chain?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
  metadata_quality?: string;
  grade?: Grade;
  min_score?: number;
  has_endpoint?: boolean;
  entity_type?: EntityType;
  has_candidate_payment_activity?: boolean;
  has_verified_payment_activity?: boolean;
}

export interface GetReputationOptions {
  chain?: string;
}

export interface AssessOptions {
  chain?: string;
  refresh?: boolean;
  policy?: DecisionPolicy;
}
