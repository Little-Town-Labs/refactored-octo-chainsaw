export const INCIDENT_SEVERITIES = ["sev1", "sev2", "sev3"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const MONITORING_SIGNAL_SOURCES = [
  "privacy_filter",
  "audit_log",
  "auth",
  "credential_lifecycle",
  "employer_api",
  "webhook_delivery",
  "manual_report",
  "notification_deadline",
] as const;
export type MonitoringSignalSource = (typeof MONITORING_SIGNAL_SOURCES)[number];

export const MONITORING_SIGNAL_CATEGORIES = [
  "privacy_filter_bypass_attempt",
  "cross_side_leakage",
  "audit_chain_integrity_failure",
  "auth_anomaly",
  "credential_misuse",
  "webhook_replay_or_signature_abuse",
  "employer_api_abuse",
  "notification_deadline_risk",
  "monitoring_sink_failure",
] as const;
export type MonitoringSignalCategory = (typeof MONITORING_SIGNAL_CATEGORIES)[number];

export const ESCALATION_HINTS = [
  "open_incident",
  "attach_to_existing",
  "review_only",
  "page_on_call",
] as const;
export type EscalationHint = (typeof ESCALATION_HINTS)[number];

export const EVIDENCE_KINDS = [
  "audit_event",
  "hash_chain_verification",
  "credential_event",
  "webhook_event",
  "api_request",
  "dossier",
  "match_ticket",
  "external_issue",
  "runbook_exercise",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const AFFECTED_SUBJECT_KINDS = [
  "match",
  "dossier",
  "principal",
  "organization",
  "credential",
  "webhook_event",
  "api_request",
  "audit_chain",
  "incident",
] as const;
export type AffectedSubjectKind = (typeof AFFECTED_SUBJECT_KINDS)[number];

export type EvidenceRef = {
  kind: EvidenceKind;
  ref: string;
  hash?: string;
  contains_personal_data?: boolean;
};

export type AffectedSubject = {
  kind: AffectedSubjectKind;
  id: string;
};

export type MonitoringSignal = {
  schema_version: "incident.monitoring_signal.v1";
  id: string;
  source: MonitoringSignalSource;
  category: MonitoringSignalCategory;
  severity: IncidentSeverity;
  dedupe_key: string;
  observed_at: string;
  affected_subject?: AffectedSubject;
  evidence_ref: EvidenceRef;
  escalation_hint: EscalationHint;
  metadata?: Record<string, unknown>;
};

export const INCIDENT_STATUSES = [
  "triage",
  "investigating",
  "contained",
  "recovering",
  "review",
  "closed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type Incident = {
  id: string;
  incident_key: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  commander_principal_id?: string;
  source_signal_id?: string;
  awareness_at?: string;
  detected_at: string;
  affected_systems: string[];
  affected_data_classes: string[];
  personal_data_involved: boolean;
  high_risk_to_data_subjects: boolean;
  notification_assessment_completed: boolean;
  postmortem_summary?: string;
  corrective_action_tracking: "pending" | "created" | "none_required";
};

export type IncidentTimelineEntry = {
  id: string;
  incident_id: string;
  entry_type:
    | "triage"
    | "containment"
    | "evidence"
    | "recovery"
    | "notification"
    | "postmortem"
    | "corrective_action";
  body: string;
  principal_id: string;
  occurred_at: string;
  evidence_ref?: EvidenceRef;
};

export type NotificationObligationType =
  | "gdpr_supervisory_authority"
  | "gdpr_data_subject_high_risk_review"
  | "us_state_counsel_review"
  | "contractual_employer_notice";

export type NotificationObligation = {
  id: string;
  incident_id: string;
  obligation_type: NotificationObligationType;
  jurisdiction: string;
  recipient: string;
  deadline_at?: string;
  status: "pending" | "counsel_review" | "not_required" | "sent" | "blocked" | "overdue";
  decision?: "notify" | "do_not_notify" | "pending_counsel";
  decision_rationale?: string;
};

export type CorrectiveAction = {
  id: string;
  incident_id: string;
  owner_principal_id: string;
  title: string;
  status: "open" | "closed";
  due_at?: string;
  closure_evidence_ref?: EvidenceRef;
};
