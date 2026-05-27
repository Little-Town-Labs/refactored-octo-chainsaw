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
  readonly event_id?: string;
  readonly delivery_id?: string;
  readonly event_type?: string;
  readonly received_at: string;
  readonly signature_valid: boolean;
  readonly payload_boundary_valid?: boolean;
  readonly idempotency_status?: "accepted" | "duplicate" | "rejected";
  readonly delivery_status?: "delivered" | "failed";
  readonly failure_reason?: string;
  readonly duration_ms?: number;
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

export const PRODUCT_SEED_BUNDLE_SCHEMA_VERSION = "pth-seed-bundle/v1";

export type ProductSeedBundleSchemaVersion = typeof PRODUCT_SEED_BUNDLE_SCHEMA_VERSION;
export type ProductSeedFixtureName =
  | "alpha-happy-path"
  | "missing-consent"
  | "consent-withdrawn"
  | "human-review-required"
  | "jurisdiction-kill-switch";

export type ProductSeedEntityType =
  | "human_principal"
  | "service_principal"
  | "agent_principal"
  | "seeker"
  | "employer"
  | "organization"
  | "job_requirement"
  | "seeker_ticket"
  | "employer_requirement_ticket"
  | "match_ticket"
  | "jurisdiction_policy"
  | "consent_record"
  | "human_review_decision"
  | "agent_contract"
  | "rubric"
  | "bias_test_evidence"
  | "privacy_ruleset"
  | "notification_template"
  | "webhook_endpoint"
  | "signing_key";

export type ProductSeedRelationshipType =
  | "owns"
  | "belongs_to"
  | "represents"
  | "consent_for"
  | "ticket_for"
  | "ticket_requires_policy"
  | "match_links"
  | "contract_uses_rubric"
  | "rubric_has_bias_evidence"
  | "uses_privacy_ruleset"
  | "webhook_for"
  | "key_for";

export type ProductSeedPosture =
  | "alpha_happy_path"
  | "active_consent"
  | "missing_consent"
  | "consent_withdrawn"
  | "jurisdiction_allowed"
  | "jurisdiction_killed"
  | "human_review_not_required"
  | "human_review_required";

export interface ProductSeedFactoryInput {
  readonly scenario_id: string;
  readonly scenario_version: string;
  readonly seed_version: string;
  readonly fixture_name: ProductSeedFixtureName;
  readonly mode: ScenarioMode;
  readonly namespace?: string;
  readonly base_time?: string;
}

export interface ProductSeedEntityRecord {
  readonly entity_type: ProductSeedEntityType;
  readonly entity_id: string;
  readonly entity_ref: string;
  readonly attributes: SafeMetadata;
  readonly posture?: ProductSeedPosture;
}

export interface ProductSeedRelationship {
  readonly relationship_id: string;
  readonly from_entity_ref: string;
  readonly to_entity_ref: string;
  readonly relationship_type: ProductSeedRelationshipType;
}

export interface ProductSeedBundle {
  readonly schema_version: ProductSeedBundleSchemaVersion;
  readonly bundle_id: string;
  readonly input: ProductSeedFactoryInput;
  readonly entities: readonly ProductSeedEntityRecord[];
  readonly relationships: readonly ProductSeedRelationship[];
  readonly seed_records: readonly ProductSeedRecord[];
  readonly metadata?: SafeMetadata;
}

export interface ProductSeedFixtureDefinition {
  readonly fixture_name: ProductSeedFixtureName;
  readonly description: string;
  readonly required_categories: readonly ProductSeedEntityType[];
  readonly build: (input: ProductSeedFactoryInput) => ProductSeedBundle;
}

export type ProductSeedApplicationStatus = "dry_run" | "applied" | "failed";

export interface ProductSeedAppliedEntity {
  readonly entity_ref: string;
  readonly entity_type: ProductSeedEntityType;
  readonly status: ProductSeedApplicationStatus;
}

export interface ProductSeedApplicationResult extends ProductSeedOutput {
  readonly status: ProductSeedApplicationStatus;
  readonly seed_version: string;
  readonly seed_refs: readonly string[];
  readonly seed_records: readonly ProductSeedRecord[];
  readonly applied_entities: readonly ProductSeedAppliedEntity[];
  readonly error?: string;
}

export type BrowserJourneyCategory =
  | "seeker_landing"
  | "seeker_auth_profile"
  | "employer_console"
  | "employer_req_creation"
  | "employer_candidate_review"
  | "operator_credential_audit"
  | "alpha_consent"
  | "informational_only";

export type BrowserArtifactCapturePolicy = "always" | "on_failure" | "never";

export interface BrowserArtifactPolicy {
  readonly screenshot: BrowserArtifactCapturePolicy;
  readonly video: BrowserArtifactCapturePolicy;
  readonly trace: BrowserArtifactCapturePolicy;
  readonly console_log: BrowserArtifactCapturePolicy;
  readonly network_log: BrowserArtifactCapturePolicy;
}

export interface BrowserViewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export interface BrowserJourneyRoute {
  readonly route_id: string;
  readonly path: string;
  readonly expected_status?: number;
  readonly expected_text?: string;
}

export interface BrowserJourney {
  readonly journey_id: string;
  readonly title: string;
  readonly category: BrowserJourneyCategory;
  readonly mode: ScenarioMode;
  readonly app_url: string;
  readonly routes: readonly BrowserJourneyRoute[];
  readonly viewports: readonly BrowserViewport[];
  readonly artifact_policy: BrowserArtifactPolicy;
  readonly tags?: readonly string[];
}

export interface BrowserJourneyVisitInput {
  readonly run_id: string;
  readonly journey: BrowserJourney;
  readonly route: BrowserJourneyRoute;
  readonly viewport: BrowserViewport;
  readonly url: string;
}

export interface BrowserJourneyVisitResult {
  readonly status: ProductEvidenceStatus;
  readonly evidence_refs: readonly string[];
  readonly console_messages?: readonly string[];
  readonly network_entries?: readonly string[];
  readonly error?: string;
}

export interface BrowserJourneyDriver {
  readonly driver_name: string;
  visit(input: BrowserJourneyVisitInput): Promise<BrowserJourneyVisitResult>;
}

export type EmployerApiScope = "req:write" | "req:read" | "webhook:manage";
export type EmployerReqAction = "create" | "update" | "close";
export type EmployerApiOperationStatus = "authorized" | "denied";
export type EmployerApiDenialReason =
  | "missing_authorization"
  | "credential_expired"
  | "missing_scope";
export type WebhookDeliveryStatus = "delivered" | "failed";
export type WebhookIdempotencyStatus = "accepted" | "duplicate" | "rejected";

export interface EmployerApiCredential {
  readonly credential_id: string;
  readonly employer_ref: string;
  readonly scopes: readonly EmployerApiScope[];
  readonly issued_at: string;
  readonly expires_at: string;
  readonly redacted_secret_ref: string;
}

export interface EmployerApiRequest {
  readonly request_id: string;
  readonly action: EmployerReqAction;
  readonly req_ref: string;
  readonly credential?: EmployerApiCredential;
  readonly required_scopes: readonly EmployerApiScope[];
  readonly submitted_at: string;
  readonly payload: SafeMetadata;
}

export interface EmployerApiOperationResult {
  readonly operation_id: string;
  readonly request: EmployerApiRequest;
  readonly status: EmployerApiOperationStatus;
  readonly reason_code?: EmployerApiDenialReason;
  readonly emitted_event_refs: readonly string[];
  readonly metadata?: SafeMetadata;
}

export interface WebhookDelivery {
  readonly event_id: string;
  readonly delivery_id: string;
  readonly event_type: string;
  readonly target_url_ref: string;
  readonly sent_at: string;
  readonly payload: SafeMetadata;
  readonly headers: Readonly<Record<string, string>>;
  readonly signing_secret_ref: string;
  readonly signing_secret: string;
  readonly expected_status: WebhookDeliveryStatus;
  readonly failure_reason?: string;
}

export interface WebhookSignatureVerification {
  readonly valid: boolean;
  readonly signature_header: string;
  readonly timestamp_header: string;
  readonly signed_payload_ref: string;
}

export interface WebhookPayloadBoundaryResult {
  readonly valid: boolean;
  readonly forbidden_paths: readonly string[];
}
