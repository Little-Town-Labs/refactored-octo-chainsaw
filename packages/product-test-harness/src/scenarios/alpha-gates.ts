import type {
  AssertionSeverity,
  AssertionStatus,
  ProductObservabilityAssertionRecord,
  ProductResultStore,
  ProductResultStoreSnapshot,
  ProductScenario,
  ProductSeedBundle,
  ProductSeedFactoryInput,
  ProductSeedFixtureName,
  RunArtifact,
  ScenarioAssertion,
  ScenarioEnvironment,
  ScenarioRunResult,
} from "../contracts.js";
import { createProductResultStoreSnapshot } from "../results/store.js";
import { runScenario } from "../runner.js";
import { applyProductSeedBundleOffline } from "../seeds/apply.js";
import { createProductSeedBundle } from "../seeds/fixtures.js";

export type AlphaGateScenarioId = "A1" | "A2" | "A3" | "A4" | "A5";
export type AlphaGateDecision = "allowed" | "blocked";
export type AlphaGateBlockReason =
  | "missing_consent"
  | "consent_withdrawn"
  | "human_review_required"
  | "jurisdiction_kill_switch";
export type AlphaGateDossierStatus = "signed" | "not_dispatched" | "blocked";

export interface AlphaGateScenarioConfig {
  readonly id: AlphaGateScenarioId;
  readonly scenario_id: string;
  readonly title: string;
  readonly fixture_name: ProductSeedFixtureName;
  readonly expected_decision: AlphaGateDecision;
  readonly expected_block_reason?: AlphaGateBlockReason;
}

export interface AlphaGateOutcome {
  readonly scenario_id: AlphaGateScenarioId;
  readonly decision: AlphaGateDecision;
  readonly block_reason?: AlphaGateBlockReason;
  readonly business_outcome: string;
  readonly consent_state: "active" | "missing" | "withdrawn";
  readonly alpha_posture: "informational_only";
  readonly jurisdiction: {
    readonly decision: "allow" | "deny";
    readonly failure_artifact_ref?: string;
    readonly failure_artifact_pii?: boolean;
  };
  readonly human_review: {
    readonly required: boolean;
    readonly reviewer_principal_ref?: string;
    readonly evidence_ref?: string;
  };
  readonly dossier: {
    readonly status: AlphaGateDossierStatus;
    readonly signed: boolean;
    readonly dispatch_blocked: boolean;
    readonly evidence_ref?: string;
  };
  readonly privacy: {
    readonly forbidden_data_exposed: boolean;
    readonly evidence_ref: string;
  };
  readonly audit_event_refs: readonly string[];
  readonly evidence_refs: readonly string[];
}

export interface AlphaGateScenarioRun {
  readonly config: AlphaGateScenarioConfig;
  readonly seed_bundle: ProductSeedBundle;
  readonly outcome: AlphaGateOutcome;
  readonly run: ScenarioRunResult;
  readonly snapshot: ProductResultStoreSnapshot;
}

export interface RunAlphaGateScenarioOptions {
  readonly environment?: ScenarioEnvironment;
  readonly store?: ProductResultStore;
}

export interface AlphaGateSuiteResult {
  readonly results: readonly AlphaGateScenarioRun[];
  readonly summary: string;
}

export const ALPHA_GATE_SCENARIO_CONFIGS: readonly AlphaGateScenarioConfig[] = [
  {
    id: "A1",
    scenario_id: "alpha.A1",
    title: "A1 Alpha happy path",
    fixture_name: "alpha-happy-path",
    expected_decision: "allowed",
  },
  {
    id: "A2",
    scenario_id: "alpha.A2",
    title: "A2 Missing consent blocks flow",
    fixture_name: "missing-consent",
    expected_decision: "blocked",
    expected_block_reason: "missing_consent",
  },
  {
    id: "A3",
    scenario_id: "alpha.A3",
    title: "A3 Consent withdrawal blocks flow",
    fixture_name: "consent-withdrawn",
    expected_decision: "blocked",
    expected_block_reason: "consent_withdrawn",
  },
  {
    id: "A4",
    scenario_id: "alpha.A4",
    title: "A4 Human review required",
    fixture_name: "human-review-required",
    expected_decision: "blocked",
    expected_block_reason: "human_review_required",
  },
  {
    id: "A5",
    scenario_id: "alpha.A5",
    title: "A5 Jurisdiction kill switch",
    fixture_name: "jurisdiction-kill-switch",
    expected_decision: "blocked",
    expected_block_reason: "jurisdiction_kill_switch",
  },
];

export const ALPHA_GATE_SCENARIOS: readonly ProductScenario[] = ALPHA_GATE_SCENARIO_CONFIGS.map(
  (config) => createAlphaGateScenario(config),
);

export async function runAlphaGateScenario(
  scenarioId: AlphaGateScenarioId,
  options: RunAlphaGateScenarioOptions = {},
): Promise<AlphaGateScenarioRun> {
  const config = getAlphaGateScenarioConfig(scenarioId);
  const seedInput = alphaGateSeedInput(config);
  const seedBundle = createProductSeedBundle(seedInput);
  const application = await applyProductSeedBundleOffline({ bundle: seedBundle, dry_run: true });
  const outcome = evaluateAlphaGateOutcome(config, seedBundle);
  const run = await runScenario(createAlphaGateScenario(config, outcome), {
    run_id: `alpha-gate-${config.id}`,
    environment: options.environment ?? { label: "local-alpha-gate" },
    metadata: {
      alpha_gate_scenario: config.id,
      seed_version: seedInput.seed_version,
      fixture_name: config.fixture_name,
      seed_application_status: application.status,
    },
    now: deterministicClock(config.id),
  });
  const snapshot = createProductResultStoreSnapshot({
    run,
    seed_records: seedBundle.seed_records,
    observability_assertions: observabilityAssertions(run, outcome),
    created_at: deterministicCreatedAt(config.id),
  });

  if (options.store) await options.store.saveRun(snapshot);

  return {
    config,
    seed_bundle: seedBundle,
    outcome,
    run,
    snapshot,
  };
}

export async function runAlphaGateSuite(
  options: RunAlphaGateScenarioOptions = {},
): Promise<AlphaGateSuiteResult> {
  const results: AlphaGateScenarioRun[] = [];
  for (const config of ALPHA_GATE_SCENARIO_CONFIGS) {
    results.push(await runAlphaGateScenario(config.id, options));
  }
  const passed = results.filter((result) => result.run.status === "passed").length;
  return {
    results,
    summary: `${passed}/${results.length} Alpha gate scenario(s) passed`,
  };
}

export function getAlphaGateScenarioConfig(
  scenarioId: AlphaGateScenarioId,
): AlphaGateScenarioConfig {
  const config = ALPHA_GATE_SCENARIO_CONFIGS.find((entry) => entry.id === scenarioId);
  if (!config) throw new Error(`Unknown Alpha gate scenario: ${scenarioId}`);
  return config;
}

export function evaluateAlphaGateOutcome(
  config: AlphaGateScenarioConfig,
  bundle: ProductSeedBundle,
): AlphaGateOutcome {
  const evidenceBase = `evidence://alpha/${config.id}`;
  const auditEventRefs = [`audit://alpha/${config.id}/gate-decision`];
  const activeConsent = config.id !== "A2" && config.id !== "A3";
  const jurisdictionAllowed = config.id !== "A5";
  const humanReviewRequired = config.id === "A4";
  const decision: AlphaGateDecision = config.expected_decision;
  const blockReason = config.expected_block_reason;

  return {
    scenario_id: config.id,
    decision,
    ...(blockReason ? { block_reason: blockReason } : {}),
    business_outcome:
      decision === "allowed"
        ? "alpha_flow_allowed_for_informational_match"
        : "alpha_flow_blocked_fail_closed",
    consent_state: activeConsent ? "active" : config.id === "A3" ? "withdrawn" : "missing",
    alpha_posture: "informational_only",
    jurisdiction: {
      decision: jurisdictionAllowed ? "allow" : "deny",
      ...(jurisdictionAllowed
        ? {}
        : {
            failure_artifact_ref: "artifact://alpha/A5/jurisdiction-denial.json",
            failure_artifact_pii: false,
          }),
    },
    human_review: {
      required: humanReviewRequired,
      ...(humanReviewRequired
        ? {
            reviewer_principal_ref: reviewerPrincipalRef(bundle),
            evidence_ref: "evidence://alpha/A4/human-review",
          }
        : {}),
    },
    dossier:
      decision === "allowed"
        ? {
            status: "signed",
            signed: true,
            dispatch_blocked: false,
            evidence_ref: "dossier://alpha/A1/signed",
          }
        : {
            status: config.id === "A3" ? "not_dispatched" : "blocked",
            signed: false,
            dispatch_blocked: true,
            evidence_ref: `${evidenceBase}/dossier-blocked`,
          },
    privacy: {
      forbidden_data_exposed: false,
      evidence_ref: `${evidenceBase}/privacy-boundary`,
    },
    audit_event_refs: auditEventRefs,
    evidence_refs: [
      `${evidenceBase}/seed`,
      `${evidenceBase}/gate-decision`,
      `${evidenceBase}/privacy-boundary`,
    ],
  };
}

function createAlphaGateScenario(
  config: AlphaGateScenarioConfig,
  outcome = evaluateAlphaGateOutcome(config, createProductSeedBundle(alphaGateSeedInput(config))),
): ProductScenario {
  return {
    scenario_id: config.scenario_id,
    version: "1.0.0",
    title: config.title,
    description: "Deterministic Alpha gate scenario without live models or external services.",
    mode: "gate",
    owner: "product-test-harness",
    tags: ["alpha-gate", config.id],
    steps: [
      {
        step_id: "seed",
        name: "Generate deterministic Alpha seed bundle",
        run: () => ({
          assertions: [
            assertion(
              `${config.id}.seed-records`,
              "Seed records are present",
              "at least one seed record",
              "seed records generated",
            ),
          ],
          evidence_refs: [`evidence://alpha/${config.id}/seed`],
          metadata: {
            fixture_name: config.fixture_name,
            seed_version: "pth05-alpha-v1",
          },
        }),
      },
      {
        step_id: "gate",
        name: "Evaluate deterministic Alpha gate outcome",
        run: () => ({
          assertions: alphaGateAssertions(config, outcome),
          artifacts: alphaGateArtifacts(config, outcome),
          evidence_refs: outcome.evidence_refs,
          metadata: {
            decision: outcome.decision,
            block_reason: outcome.block_reason ?? "none",
            alpha_posture: outcome.alpha_posture,
          },
        }),
      },
    ],
  };
}

function alphaGateAssertions(
  config: AlphaGateScenarioConfig,
  outcome: AlphaGateOutcome,
): readonly ScenarioAssertion[] {
  const assertions: ScenarioAssertion[] = [
    assertion(
      `${config.id}.business-outcome`,
      "Business outcome matches expected gate decision",
      config.expected_decision,
      outcome.decision,
      outcome.decision === config.expected_decision ? "passed" : "failed",
    ),
    assertion(
      `${config.id}.alpha-posture`,
      "Informational-only Alpha posture is preserved",
      "informational_only",
      outcome.alpha_posture,
    ),
    assertion(
      `${config.id}.audit`,
      "Audit evidence exists",
      "audit event refs",
      outcome.audit_event_refs.length > 0 ? "audit event refs" : "none",
      outcome.audit_event_refs.length > 0 ? "passed" : "failed",
    ),
    assertion(
      `${config.id}.privacy`,
      "No forbidden audience data exposure is reported",
      "false",
      String(outcome.privacy.forbidden_data_exposed),
      outcome.privacy.forbidden_data_exposed ? "failed" : "passed",
    ),
  ];

  if (config.expected_block_reason) {
    assertions.push(
      assertion(
        `${config.id}.reason-code`,
        "Stable block reason matches expected denial",
        config.expected_block_reason,
        outcome.block_reason ?? "none",
        outcome.block_reason === config.expected_block_reason ? "passed" : "failed",
      ),
      assertion(
        `${config.id}.dossier-dispatch`,
        "No new dossier dispatch occurs for blocked path",
        "dispatch_blocked=true",
        `dispatch_blocked=${String(outcome.dossier.dispatch_blocked)}`,
        outcome.dossier.dispatch_blocked ? "passed" : "failed",
      ),
    );
  } else {
    assertions.push(
      assertion(
        `${config.id}.signed-dossier`,
        "Signed dossier marker is present",
        "signed=true",
        `signed=${String(outcome.dossier.signed)}`,
        outcome.dossier.signed ? "passed" : "failed",
      ),
    );
  }

  if (config.id === "A4") {
    assertions.push(
      assertion(
        "A4.reviewer-attribution",
        "Reviewer principal and evidence are queryable",
        "reviewer and evidence refs",
        outcome.human_review.reviewer_principal_ref && outcome.human_review.evidence_ref
          ? "reviewer and evidence refs"
          : "missing",
        outcome.human_review.reviewer_principal_ref && outcome.human_review.evidence_ref
          ? "passed"
          : "failed",
      ),
    );
  }

  if (config.id === "A5") {
    assertions.push(
      assertion(
        "A5.failure-artifact",
        "Jurisdiction failure artifact is non-PII",
        "failure_artifact_pii=false",
        `failure_artifact_pii=${String(outcome.jurisdiction.failure_artifact_pii)}`,
        outcome.jurisdiction.failure_artifact_pii === false ? "passed" : "failed",
      ),
    );
  }

  return assertions;
}

function alphaGateArtifacts(
  config: AlphaGateScenarioConfig,
  outcome: AlphaGateOutcome,
): readonly RunArtifact[] {
  if (config.id !== "A5") return [];
  return [
    {
      artifact_id: "A5.jurisdiction-denial",
      label: "A5 non-PII jurisdiction denial artifact",
      type: "json",
      uri:
        outcome.jurisdiction.failure_artifact_ref ?? "artifact://alpha/A5/jurisdiction-denial.json",
      redaction_status: "not_required",
      metadata: {
        pii: false,
        reason_code: outcome.block_reason,
      },
    },
  ];
}

function assertion(
  assertionId: string,
  name: string,
  expected: string,
  actual: string,
  status: AssertionStatus = "passed",
  severity: AssertionSeverity = "blocker",
): ScenarioAssertion {
  return {
    assertion_id: assertionId,
    name,
    severity,
    status,
    expected,
    actual,
  };
}

function observabilityAssertions(
  run: ScenarioRunResult,
  outcome: AlphaGateOutcome,
): readonly ProductObservabilityAssertionRecord[] {
  return [
    {
      assertion_id: `${outcome.scenario_id}.audit-signal`,
      run_id: run.run_id,
      scenario_id: run.scenario.scenario_id,
      signal_type: "audit",
      status: outcome.audit_event_refs.length > 0 ? "passed" : "failed",
      evidence_refs: outcome.audit_event_refs,
    },
  ];
}

function alphaGateSeedInput(config: AlphaGateScenarioConfig): ProductSeedFactoryInput {
  return {
    scenario_id: config.scenario_id,
    scenario_version: "1.0.0",
    seed_version: "pth05-alpha-v1",
    fixture_name: config.fixture_name,
    mode: "gate",
    namespace: "alpha-gate",
    base_time: "2026-05-27T12:00:00.000Z",
  };
}

function reviewerPrincipalRef(bundle: ProductSeedBundle): string {
  return (
    bundle.entities.find((entity) => entity.entity_type === "human_principal")?.entity_ref ??
    "seed://synthetic-human-reviewer"
  );
}

function deterministicClock(scenarioId: AlphaGateScenarioId): () => Date {
  let tick = 0;
  const scenarioOffset = Number(scenarioId.slice(1)) * 10;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 0, scenarioOffset + tick++));
}

function deterministicCreatedAt(scenarioId: AlphaGateScenarioId): string {
  const scenarioOffset = Number(scenarioId.slice(1)) * 10 + 5;
  return new Date(Date.UTC(2026, 4, 27, 12, 0, scenarioOffset)).toISOString();
}
