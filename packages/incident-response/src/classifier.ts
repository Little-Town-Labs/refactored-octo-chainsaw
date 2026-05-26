import { monitoringSignalSchema } from "./schemas.js";
import type {
  AffectedSubject,
  EvidenceRef,
  IncidentSeverity,
  MonitoringSignal,
  MonitoringSignalCategory,
  MonitoringSignalSource,
} from "./types.js";

export type ClassifySignalInput = {
  id: string;
  source: MonitoringSignalSource;
  category: MonitoringSignalCategory;
  observed_at: string;
  evidence_ref: EvidenceRef;
  affected_subject?: AffectedSubject;
  requested_severity?: IncidentSeverity;
  metadata?: Record<string, unknown>;
};

const DEFAULT_SEVERITY: Record<MonitoringSignalCategory, IncidentSeverity> = {
  privacy_filter_bypass_attempt: "sev2",
  cross_side_leakage: "sev1",
  audit_chain_integrity_failure: "sev1",
  auth_anomaly: "sev3",
  credential_misuse: "sev2",
  webhook_replay_or_signature_abuse: "sev2",
  employer_api_abuse: "sev3",
  notification_deadline_risk: "sev2",
  monitoring_sink_failure: "sev2",
};

const HARD_SEV1 = new Set<MonitoringSignalCategory>([
  "cross_side_leakage",
  "audit_chain_integrity_failure",
]);

export function classifyMonitoringSignal(input: ClassifySignalInput): MonitoringSignal {
  const severity = HARD_SEV1.has(input.category)
    ? "sev1"
    : (input.requested_severity ?? DEFAULT_SEVERITY[input.category]);
  const signal: MonitoringSignal = {
    schema_version: "incident.monitoring_signal.v1",
    id: input.id,
    source: input.source,
    category: input.category,
    severity,
    dedupe_key: buildDedupeKey(input),
    observed_at: input.observed_at,
    evidence_ref: input.evidence_ref,
    escalation_hint: severity === "sev1" ? "page_on_call" : "open_incident",
    ...(input.affected_subject ? { affected_subject: input.affected_subject } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  monitoringSignalSchema.parse(signal);
  return signal;
}

export function buildDedupeKey(
  input: Pick<ClassifySignalInput, "source" | "category" | "affected_subject">,
): string {
  const affected = input.affected_subject
    ? `${input.affected_subject.kind}:${input.affected_subject.id}`
    : "global";
  return `${input.source}:${input.category}:${affected}`;
}
