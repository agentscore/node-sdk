export interface AgentScoreConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type EntityType = 'agent' | 'service' | 'hybrid' | 'wallet' | 'bot' | 'unknown';
export type ReputationStatus = 'unknown' | 'known_unscored' | 'scored' | 'stale' | 'indexing';

export interface Subject {
  chain: string;
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
  status: ReputationStatus;
  value: number | null;
  grade: Grade | null;
  confidence: number | null;
  dimensions: Record<string, number> | null;
  scored_at: string | null;
  version: string;
}

export interface ERC8004Identity {
  chain: string;
  token_id: number;
  registry_contract: string | null;
  name: string | null;
  description: string | null;
  metadata_quality: string | null;
  endpoint_count: number;
}

export interface Identity {
  ens_name: string | null;
  website_url: string | null;
  github_url: string | null;
  erc8004: ERC8004Identity | null;
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

export interface ReputationResponse {
  subject: Subject;
  classification: Classification;
  score: Score;
  identity: Identity | null;
  activity: Activity | null;
  evidence_summary: Record<string, unknown> | null;
  data_semantics: string;
  caveats: string[];
  updated_at: string | null;
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

export interface AssessResponse extends ReputationResponse {
  decision: string | null;
  decision_reasons: string[];
  on_the_fly: boolean;
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
