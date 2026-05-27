export type ScenarioMode = "gate" | "eval";
export type RunStatus = "passed" | "failed" | "invalid";
export type StepStatus = "passed" | "failed" | "skipped";
export type AssertionStatus = "passed" | "failed" | "skipped";
export type AssertionSeverity = "blocker" | "major" | "minor" | "info";
export type ArtifactType =
  | "json"
  | "markdown"
  | "screenshot"
  | "video"
  | "trace"
  | "webhook_capture"
  | "agent_transcript"
  | "log_excerpt"
  | "other";
export type ArtifactRedactionStatus =
  | "not_required"
  | "redacted"
  | "contains_sensitive_synthetic_data";

export type SafeMetadata = Readonly<Record<string, unknown>>;

export interface ProductScenario {
  readonly scenario_id: string;
  readonly version: string;
  readonly title: string;
  readonly description?: string;
  readonly mode: ScenarioMode;
  readonly owner?: string;
  readonly tags?: readonly string[];
  readonly steps: readonly ScenarioStepDefinition[];
}

export interface ScenarioIdentity {
  readonly scenario_id: string;
  readonly version: string;
  readonly title: string;
  readonly description?: string;
  readonly mode: ScenarioMode;
  readonly owner?: string;
  readonly tags?: readonly string[];
}

export interface ScenarioEnvironment {
  readonly label: string;
  readonly app_url?: string;
  readonly [key: string]: unknown;
}

export interface ScenarioGitMetadata {
  readonly sha?: string;
  readonly ref?: string;
}

export interface ScenarioStepDefinition {
  readonly step_id: string;
  readonly name: string;
  readonly run: (context: ScenarioRunContext) => Promise<ScenarioStepOutput> | ScenarioStepOutput;
}

export interface ScenarioRunContext {
  readonly run_id: string;
  readonly scenario: ScenarioIdentity;
  readonly environment: ScenarioEnvironment;
  readonly database?: ProductDatabaseBranchContext;
}

export interface ScenarioStepOutput {
  readonly status?: StepStatus;
  readonly evidence_refs?: readonly string[];
  readonly assertions?: readonly ScenarioAssertion[];
  readonly artifacts?: readonly RunArtifact[];
  readonly metadata?: SafeMetadata;
}

export interface ScenarioStepRecord {
  readonly step_id: string;
  readonly order: number;
  readonly name: string;
  readonly status: StepStatus;
  readonly started_at: string;
  readonly ended_at: string;
  readonly duration_ms: number;
  readonly evidence_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
  readonly error?: string;
}

export interface ScenarioAssertion {
  readonly assertion_id: string;
  readonly name: string;
  readonly severity: AssertionSeverity;
  readonly status: AssertionStatus;
  readonly expected: string;
  readonly actual: string;
  readonly evidence_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
}

export interface RunArtifact {
  readonly artifact_id: string;
  readonly label: string;
  readonly type: ArtifactType;
  readonly uri: string;
  readonly redaction_status: ArtifactRedactionStatus;
  readonly checksum?: string;
  readonly metadata?: SafeMetadata;
}

export interface ScenarioRunResult {
  readonly run_id: string;
  readonly scenario: ScenarioIdentity;
  readonly environment: ScenarioEnvironment;
  readonly git?: ScenarioGitMetadata;
  readonly started_at: string;
  readonly ended_at: string;
  readonly duration_ms: number;
  readonly status: RunStatus;
  readonly steps: readonly ScenarioStepRecord[];
  readonly assertions: readonly ScenarioAssertion[];
  readonly artifacts: readonly RunArtifact[];
  readonly summary: string;
  readonly metadata?: SafeMetadata;
}

export interface RunScenarioOptions {
  readonly run_id?: string;
  readonly environment: ScenarioEnvironment;
  readonly git?: ScenarioGitMetadata;
  readonly metadata?: SafeMetadata;
  readonly database?: ProductDatabaseBranchContext;
  readonly now?: () => Date;
}

export interface AdapterMetadata {
  readonly adapter: "neon" | "browser" | "webhook" | "observability" | "pi" | "other";
  readonly version?: string;
  readonly values: SafeMetadata;
}

export type ProductDatabaseCleanupPolicy =
  | "always_delete"
  | "delete_on_success"
  | "retain_on_failure"
  | "retain_always";

export type LifecyclePhaseStatus = "not_started" | "passed" | "failed";
export type SeedLifecycleStatus = "not_configured" | LifecyclePhaseStatus;
export type CleanupStatus = "deleted" | "retained" | "failed" | "not_created";

export interface ProductDatabaseLifecycleConfig {
  readonly project_id?: string;
  readonly parent_branch_id: string;
  readonly branch_name_prefix: string;
  readonly migrations_folder: string;
  readonly cleanup_policy?: ProductDatabaseCleanupPolicy;
  readonly retain_reason?: string;
  readonly seed_version?: string;
}

export interface ProductDatabaseBranchContext {
  readonly branch_id: string;
  readonly branch_name: string;
  readonly parent_branch_id: string;
  readonly database_url: string;
  readonly safe_database_ref: string;
}

export interface ProductMigrationExecution {
  readonly status: LifecyclePhaseStatus;
  readonly migrations_folder: string;
  readonly started_at?: string;
  readonly ended_at?: string;
  readonly duration_ms?: number;
  readonly error?: string;
}

export interface ProductSeedExecution {
  readonly status: SeedLifecycleStatus;
  readonly seed_version?: string;
  readonly seed_refs?: readonly string[];
  readonly started_at?: string;
  readonly ended_at?: string;
  readonly duration_ms?: number;
  readonly error?: string;
}

export interface ProductCleanupResult {
  readonly status: CleanupStatus;
  readonly policy: ProductDatabaseCleanupPolicy;
  readonly reason?: string;
  readonly started_at?: string;
  readonly ended_at?: string;
  readonly duration_ms?: number;
}

export interface ProductDatabaseLifecycleMetadata {
  readonly adapter: "neon";
  readonly branch?: {
    readonly branch_id: string;
    readonly branch_name: string;
    readonly parent_branch_id: string;
    readonly safe_database_ref: string;
  };
  readonly migration: ProductMigrationExecution;
  readonly seed: ProductSeedExecution;
  readonly cleanup: ProductCleanupResult;
  readonly redaction: {
    readonly database_url_redacted: true;
    readonly redaction_strategy: string;
  };
}

export interface ProductSeedOutput {
  readonly seed_version?: string;
  readonly seed_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
}

export const PRODUCT_RESULT_STORE_SCHEMA_VERSION = "pth-result-store/v1";

export type ProductResultStoreSchemaVersion = typeof PRODUCT_RESULT_STORE_SCHEMA_VERSION;

export interface ProductSeedRecord {
  readonly seed_id: string;
  readonly seed_version: string;
  readonly entity_type: string;
  readonly entity_ref: string;
  readonly scenario_id: string;
  readonly metadata?: SafeMetadata;
}

export type ProductEvidenceStatus = "passed" | "failed" | "skipped";

export interface ProductAgentInvocationRecord {
  readonly invocation_id: string;
  readonly driver: string;
  readonly persona_id?: string;
  readonly scenario_id: string;
  readonly started_at?: string;
  readonly ended_at?: string;
  readonly status: ProductEvidenceStatus;
  readonly artifact_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
}

export interface ProductBrowserArtifactRecord {
  readonly artifact_id: string;
  readonly run_id: string;
  readonly scenario_id: string;
  readonly kind: "screenshot" | "video" | "trace" | "console_log" | "network_log" | "other";
  readonly uri: string;
  readonly redaction_status: ArtifactRedactionStatus;
  readonly redaction_note?: string;
  readonly checksum?: string;
  readonly metadata?: SafeMetadata;
}

export interface ProductWebhookCaptureRecord {
  readonly capture_id: string;
  readonly run_id: string;
  readonly scenario_id: string;
  readonly received_at: string;
  readonly signature_valid: boolean;
  readonly idempotency_key?: string;
  readonly artifact_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
}

export interface ProductObservabilityAssertionRecord {
  readonly assertion_id: string;
  readonly run_id: string;
  readonly scenario_id: string;
  readonly signal_type: "audit" | "monitoring" | "sentry" | "log" | "incident" | "other";
  readonly status: AssertionStatus;
  readonly evidence_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
}

export interface ProductResultStoreSnapshot {
  readonly schema_version: ProductResultStoreSchemaVersion;
  readonly run: ScenarioRunResult;
  readonly seed_records: readonly ProductSeedRecord[];
  readonly agent_invocations: readonly ProductAgentInvocationRecord[];
  readonly browser_artifacts: readonly ProductBrowserArtifactRecord[];
  readonly webhook_captures: readonly ProductWebhookCaptureRecord[];
  readonly observability_assertions: readonly ProductObservabilityAssertionRecord[];
  readonly created_at: string;
}

export interface ProductResultStoreSnapshotInput {
  readonly run: ScenarioRunResult;
  readonly seed_records?: readonly ProductSeedRecord[];
  readonly agent_invocations?: readonly ProductAgentInvocationRecord[];
  readonly browser_artifacts?: readonly ProductBrowserArtifactRecord[];
  readonly webhook_captures?: readonly ProductWebhookCaptureRecord[];
  readonly observability_assertions?: readonly ProductObservabilityAssertionRecord[];
  readonly created_at?: string;
}

export interface ProductResultRunSummary {
  readonly run_id: string;
  readonly scenario_id: string;
  readonly scenario_version: string;
  readonly mode: ScenarioMode;
  readonly status: RunStatus;
  readonly environment_label: string;
  readonly git_ref?: string;
  readonly git_sha?: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly created_at: string;
  readonly summary: string;
  readonly artifact_count: number;
  readonly assertion_count: number;
  readonly step_count: number;
}

export interface ProductResultStoreFilters {
  readonly mode?: ScenarioMode;
  readonly status?: RunStatus;
  readonly scenario_id?: string;
  readonly environment_label?: string;
  readonly git_ref?: string;
  readonly started_after?: string;
  readonly started_before?: string;
  readonly limit?: number;
}

export interface ProductResultStoreSaveResult {
  readonly run_id: string;
  readonly created: boolean;
  readonly idempotent: boolean;
}

export interface ProductResultStore {
  saveRun(snapshot: ProductResultStoreSnapshot): Promise<ProductResultStoreSaveResult>;
  getRun(runId: string): Promise<ProductResultStoreSnapshot | undefined>;
  listRuns(filters?: ProductResultStoreFilters): Promise<readonly ProductResultRunSummary[]>;
}
