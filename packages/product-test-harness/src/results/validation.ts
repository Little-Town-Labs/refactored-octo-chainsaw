import type {
  ProductAgentInvocationRecord,
  ProductBrowserArtifactRecord,
  ProductObservabilityAssertionRecord,
  ProductResultStoreSnapshot,
  ProductSeedRecord,
  ProductWebhookCaptureRecord,
  RunArtifact,
} from "../contracts.js";
import { PRODUCT_RESULT_STORE_SCHEMA_VERSION, type ArtifactRedactionStatus } from "../contracts.js";
import { validateArtifact, validateAssertion, validateRunResult } from "../validation.js";
import { containsDatabaseUrl } from "../db/redaction.js";

const REDACTION_STATUSES = new Set<ArtifactRedactionStatus>([
  "not_required",
  "redacted",
  "contains_sensitive_synthetic_data",
]);

export function validateProductResultStoreSnapshot(snapshot: ProductResultStoreSnapshot): string[] {
  const issues: string[] = [];
  if (snapshot.schema_version !== PRODUCT_RESULT_STORE_SCHEMA_VERSION) {
    issues.push("schema_version is unsupported");
  }
  requireDate("created_at", snapshot.created_at, issues);
  issues.push(...validateRunResult(snapshot.run));
  snapshot.run.artifacts.forEach((artifact, index) => {
    issues.push(...validateStoredArtifact(artifact, `run.artifacts[${index}]`));
  });
  snapshot.seed_records.forEach((record, index) => {
    issues.push(...validateSeedRecord(record, `seed_records[${index}]`));
  });
  snapshot.agent_invocations.forEach((record, index) => {
    issues.push(...validateAgentInvocation(record, `agent_invocations[${index}]`));
  });
  snapshot.browser_artifacts.forEach((record, index) => {
    issues.push(...validateBrowserArtifact(record, `browser_artifacts[${index}]`));
  });
  snapshot.webhook_captures.forEach((record, index) => {
    issues.push(...validateWebhookCapture(record, `webhook_captures[${index}]`));
  });
  snapshot.observability_assertions.forEach((record, index) => {
    issues.push(...validateObservabilityAssertion(record, `observability_assertions[${index}]`));
  });
  rejectUnsafeValues(snapshot, issues);
  return issues;
}

export function validateStoredArtifact(artifact: RunArtifact, path: string): string[] {
  const issues = validateArtifact(artifact, path);
  if (artifact.redaction_status === "contains_sensitive_synthetic_data") {
    const note = artifact.metadata?.redaction_note;
    if (typeof note !== "string" || note.trim() === "") {
      issues.push(`${path}.metadata.redaction_note is required for sensitive synthetic data`);
    }
  }
  return issues;
}

function validateSeedRecord(record: ProductSeedRecord, path: string): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.seed_id`, record.seed_id, issues);
  requireNonEmpty(`${path}.seed_version`, record.seed_version, issues);
  requireNonEmpty(`${path}.entity_type`, record.entity_type, issues);
  requireNonEmpty(`${path}.entity_ref`, record.entity_ref, issues);
  requireNonEmpty(`${path}.scenario_id`, record.scenario_id, issues);
  return issues;
}

function validateAgentInvocation(record: ProductAgentInvocationRecord, path: string): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.invocation_id`, record.invocation_id, issues);
  requireNonEmpty(`${path}.driver`, record.driver, issues);
  requireNonEmpty(`${path}.scenario_id`, record.scenario_id, issues);
  if (!["passed", "failed", "skipped"].includes(record.status)) {
    issues.push(`${path}.status is invalid`);
  }
  if (record.started_at) requireDate(`${path}.started_at`, record.started_at, issues);
  if (record.ended_at) requireDate(`${path}.ended_at`, record.ended_at, issues);
  return issues;
}

function validateBrowserArtifact(record: ProductBrowserArtifactRecord, path: string): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.artifact_id`, record.artifact_id, issues);
  requireNonEmpty(`${path}.run_id`, record.run_id, issues);
  requireNonEmpty(`${path}.scenario_id`, record.scenario_id, issues);
  requireNonEmpty(`${path}.uri`, record.uri, issues);
  if (
    !["screenshot", "video", "trace", "console_log", "network_log", "other"].includes(record.kind)
  ) {
    issues.push(`${path}.kind is invalid`);
  }
  if (!REDACTION_STATUSES.has(record.redaction_status)) {
    issues.push(`${path}.redaction_status is invalid`);
  }
  if (
    record.redaction_status === "contains_sensitive_synthetic_data" &&
    (!record.redaction_note || record.redaction_note.trim() === "")
  ) {
    issues.push(`${path}.redaction_note is required for sensitive synthetic data`);
  }
  return issues;
}

function validateWebhookCapture(record: ProductWebhookCaptureRecord, path: string): string[] {
  const issues: string[] = [];
  requireNonEmpty(`${path}.capture_id`, record.capture_id, issues);
  requireNonEmpty(`${path}.run_id`, record.run_id, issues);
  requireNonEmpty(`${path}.scenario_id`, record.scenario_id, issues);
  requireDate(`${path}.received_at`, record.received_at, issues);
  if (typeof record.signature_valid !== "boolean") {
    issues.push(`${path}.signature_valid must be a boolean`);
  }
  return issues;
}

function validateObservabilityAssertion(
  record: ProductObservabilityAssertionRecord,
  path: string,
): string[] {
  const assertion = {
    assertion_id: record.assertion_id,
    name: `${record.signal_type} signal`,
    severity: "major" as const,
    status: record.status,
    expected: "signal present",
    actual: record.status,
    ...(record.evidence_refs ? { evidence_refs: record.evidence_refs } : {}),
    ...(record.metadata ? { metadata: record.metadata } : {}),
  };
  const issues = validateAssertion(assertion, path);
  requireNonEmpty(`${path}.run_id`, record.run_id, issues);
  requireNonEmpty(`${path}.scenario_id`, record.scenario_id, issues);
  if (!["audit", "monitoring", "sentry", "log", "incident", "other"].includes(record.signal_type)) {
    issues.push(`${path}.signal_type is invalid`);
  }
  return issues;
}

function rejectUnsafeValues(value: unknown, issues: string[], path = "snapshot"): void {
  if (typeof value === "string") {
    if (containsDatabaseUrl(value)) issues.push(`${path} must not contain a database URL`);
    if (/(?:api[_-]?key|secret|token|password)=/i.test(value)) {
      issues.push(`${path} must not contain credential-bearing values`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectUnsafeValues(entry, issues, `${path}[${index}]`));
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    rejectUnsafeValues(entry, issues, `${path}.${key}`);
  });
}

function requireNonEmpty(path: string, value: string, issues: string[]): void {
  if (value.trim() === "") issues.push(`${path} must be non-empty`);
}

function requireDate(path: string, value: string, issues: string[]): void {
  requireNonEmpty(path, value, issues);
  if (Number.isNaN(Date.parse(value))) issues.push(`${path} must be an ISO date-time`);
}
