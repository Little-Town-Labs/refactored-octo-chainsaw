export const AGENT_CONTRACT_SIDES = ["seeker", "employer"] as const;
export type AgentContractSide = (typeof AGENT_CONTRACT_SIDES)[number];

export const AGENT_CONTRACT_STATUSES = ["draft", "published", "deprecated", "retired"] as const;
export type AgentContractStatus = (typeof AGENT_CONTRACT_STATUSES)[number];

export const AGENT_CONTRACT_EVENT_TYPES = ["published", "deprecated"] as const;
export type AgentContractEventType = (typeof AGENT_CONTRACT_EVENT_TYPES)[number];

export const AGENT_CONTRACT_EVENT_REASON_CODES = [
  "initial_launch",
  "policy_update",
  "rubric_ref_update",
  "prompt_ref_update",
  "tool_surface_update",
  "model_update",
  "runtime_setting_update",
  "compliance_deprecation",
] as const;
export type AgentContractEventReasonCode = (typeof AGENT_CONTRACT_EVENT_REASON_CODES)[number];

export const CONTRACT_RESOLUTION_DECISIONS = ["allow", "deny"] as const;
export type ContractResolutionDecision = (typeof CONTRACT_RESOLUTION_DECISIONS)[number];

export const CONTRACT_RESOLUTION_REASON_CODES = [
  "contract_resolved",
  "missing_contract",
  "contract_deprecated",
  "contract_schema_invalid",
  "contract_version_mutation_error",
  "prompt_template_unresolvable",
  "rubric_unresolvable",
  "rubric_missing_bias_test",
  "tool_version_unavailable",
  "model_unavailable",
  "unauthorized",
] as const;
export type ContractResolutionReasonCode = (typeof CONTRACT_RESOLUTION_REASON_CODES)[number];

export interface VersionedRef {
  readonly id: string;
  readonly version: string;
}

export interface ModelRef {
  readonly provider: string;
  readonly model_id: string;
  readonly version: string;
}

export interface AgentContractRuntimeSettings {
  readonly max_rounds?: number;
  readonly timeout_ms?: number;
  readonly max_tool_calls_per_turn?: number;
}

export interface AgentContractVersion {
  readonly agent_contract_version_id: string;
  readonly contract_id: string;
  readonly version: string;
  readonly side: AgentContractSide;
  readonly status: AgentContractStatus;
  readonly prompt_template_ref: VersionedRef;
  readonly rubric_ref: VersionedRef;
  readonly tool_surface_ref: VersionedRef;
  readonly model_ref: ModelRef;
  readonly runtime_settings: AgentContractRuntimeSettings;
  readonly extension_fields: Readonly<Record<string, unknown>>;
  readonly content_hash: string;
  readonly description: string;
  readonly author_principal_id: string;
  readonly reviewer_principal_id: string | null;
  readonly published_at: Date | null;
  readonly deprecated_after: Date | null;
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewAgentContractVersion = Omit<
  AgentContractVersion,
  "agent_contract_version_id" | "created_at"
> & {
  readonly agent_contract_version_id?: string;
  readonly created_at?: Date;
};

export interface AgentContractEvent {
  readonly agent_contract_event_id: string;
  readonly agent_contract_version_id: string;
  readonly event_type: AgentContractEventType;
  readonly reason_code: AgentContractEventReasonCode;
  readonly principal_id: string;
  readonly reviewer_principal_id: string | null;
  readonly correlation_id: string;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export type NewAgentContractEvent = Omit<
  AgentContractEvent,
  "agent_contract_event_id" | "created_at"
> & {
  readonly agent_contract_event_id?: string;
  readonly created_at?: Date;
};

export interface ContractRef {
  readonly contract_id: string;
  readonly version: string;
}

export interface RuntimeClamp {
  readonly field: keyof AgentContractRuntimeSettings;
  readonly requested: number;
  readonly effective: number;
}

export interface DependencyResult {
  readonly kind: "prompt_template" | "rubric" | "tool_surface" | "model";
  readonly status: "available" | "unavailable" | "missing_bias_test";
  readonly ref?: Readonly<Record<string, unknown>>;
}

export interface ContractResolution {
  readonly decision: ContractResolutionDecision;
  readonly reason_code: ContractResolutionReasonCode;
  readonly contract_ref: ContractRef;
  readonly contract: AgentContractVersion | null;
  readonly effective_runtime_settings: AgentContractRuntimeSettings;
  readonly runtime_clamps: readonly RuntimeClamp[];
  readonly dependency_results: readonly DependencyResult[];
}
