// F24 — Incident response, breach notification, and monitoring.
//
// schema-lint: skip-r2-timestamps
// Reason: incident timeline entries and evidence references are immutable operational records.

import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { principals } from "./principals.js";

export const INCIDENT_SEVERITIES = ["sev1", "sev2", "sev3"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

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

export const INCIDENT_STATUSES = [
  "triage",
  "investigating",
  "contained",
  "recovering",
  "review",
  "closed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const NOTIFICATION_OBLIGATION_TYPES = [
  "gdpr_supervisory_authority",
  "gdpr_data_subject_high_risk_review",
  "us_state_counsel_review",
  "contractual_employer_notice",
] as const;
export type NotificationObligationType = (typeof NOTIFICATION_OBLIGATION_TYPES)[number];

export const monitoringSignals = pgTable(
  "monitoring_signals",
  {
    monitoring_signal_id: uuid("monitoring_signal_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    source: text("source").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("open"),
    dedupe_key: text("dedupe_key").notNull(),
    observed_at: timestamp("observed_at", { withTimezone: true }).notNull(),
    affected_subject_kind: text("affected_subject_kind"),
    affected_subject_id: text("affected_subject_id"),
    evidence_ref: jsonb("evidence_ref").$type<Record<string, unknown>>().notNull(),
    escalation_hint: text("escalation_hint").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "monitoring_signals_category_check",
      sql`${t.category} IN ('privacy_filter_bypass_attempt','cross_side_leakage','audit_chain_integrity_failure','auth_anomaly','credential_misuse','webhook_replay_or_signature_abuse','employer_api_abuse','notification_deadline_risk','monitoring_sink_failure')`,
    ),
    check("monitoring_signals_severity_check", sql`${t.severity} IN ('sev1','sev2','sev3')`),
    check("monitoring_signals_dedupe_key_check", sql`${t.dedupe_key} <> ''`),
    index("monitoring_signals_status_idx").on(t.status, t.severity, t.created_at.desc()),
    index("monitoring_signals_dedupe_idx").on(t.dedupe_key, t.created_at.desc()),
  ],
);

export const incidents = pgTable(
  "incidents",
  {
    incident_id: uuid("incident_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    incident_key: text("incident_key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("triage"),
    commander_principal_id: uuid("commander_principal_id").references(
      () => principals.principal_id,
    ),
    source_signal_id: uuid("source_signal_id").references(
      () => monitoringSignals.monitoring_signal_id,
    ),
    awareness_at: timestamp("awareness_at", { withTimezone: true }),
    detected_at: timestamp("detected_at", { withTimezone: true }).notNull(),
    affected_systems: jsonb("affected_systems").$type<string[]>().notNull(),
    affected_data_classes: jsonb("affected_data_classes").$type<string[]>().notNull(),
    personal_data_involved: text("personal_data_involved").notNull().default("unknown"),
    high_risk_to_data_subjects: text("high_risk_to_data_subjects").notNull().default("unknown"),
    notification_summary: text("notification_summary"),
    created_by_principal_id: uuid("created_by_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    closed_at: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    check("incidents_key_check", sql`${t.incident_key} <> ''`),
    check("incidents_severity_check", sql`${t.severity} IN ('sev1','sev2','sev3')`),
    check(
      "incidents_status_check",
      sql`${t.status} IN ('triage','investigating','contained','recovering','review','closed')`,
    ),
    index("incidents_status_idx").on(t.status, t.severity, t.updated_at.desc()),
  ],
);

export const incidentTimelineEntries = pgTable(
  "incident_timeline_entries",
  {
    incident_timeline_entry_id: uuid("incident_timeline_entry_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    incident_id: uuid("incident_id")
      .notNull()
      .references(() => incidents.incident_id),
    entry_type: text("entry_type").notNull(),
    body: text("body").notNull(),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id),
    occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull(),
    evidence_ref: jsonb("evidence_ref").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("incident_timeline_entries_body_check", sql`${t.body} <> ''`),
    index("incident_timeline_entries_incident_idx").on(t.incident_id, t.occurred_at),
  ],
);

export const incidentEvidenceReferences = pgTable(
  "incident_evidence_references",
  {
    incident_evidence_reference_id: uuid("incident_evidence_reference_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    incident_id: uuid("incident_id")
      .notNull()
      .references(() => incidents.incident_id),
    kind: text("kind").notNull(),
    ref: text("ref").notNull(),
    hash: text("hash"),
    contains_personal_data: text("contains_personal_data").notNull().default("unknown"),
    retention_note: text("retention_note"),
    tombstone_ref: text("tombstone_ref"),
    created_by_principal_id: uuid("created_by_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("incident_evidence_references_ref_check", sql`${t.ref} <> ''`),
    index("incident_evidence_references_incident_idx").on(t.incident_id, t.created_at.desc()),
  ],
);

export const incidentNotificationObligations = pgTable(
  "incident_notification_obligations",
  {
    notification_obligation_id: uuid("notification_obligation_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    incident_id: uuid("incident_id")
      .notNull()
      .references(() => incidents.incident_id),
    obligation_type: text("obligation_type").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    recipient: text("recipient").notNull(),
    deadline_at: timestamp("deadline_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    decision: text("decision"),
    decision_rationale: text("decision_rationale"),
    decided_by_principal_id: uuid("decided_by_principal_id").references(
      () => principals.principal_id,
    ),
    decided_at: timestamp("decided_at", { withTimezone: true }),
    sent_at: timestamp("sent_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "incident_notification_obligations_type_check",
      sql`${t.obligation_type} IN ('gdpr_supervisory_authority','gdpr_data_subject_high_risk_review','us_state_counsel_review','contractual_employer_notice')`,
    ),
    index("incident_notification_obligations_deadline_idx").on(t.status, t.deadline_at),
  ],
);

export const incidentCorrectiveActions = pgTable(
  "incident_corrective_actions",
  {
    corrective_action_id: uuid("corrective_action_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    incident_id: uuid("incident_id")
      .notNull()
      .references(() => incidents.incident_id),
    owner_principal_id: uuid("owner_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"),
    due_at: timestamp("due_at", { withTimezone: true }),
    closed_at: timestamp("closed_at", { withTimezone: true }),
    closure_evidence_ref: jsonb("closure_evidence_ref").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("incident_corrective_actions_title_check", sql`${t.title} <> ''`),
    index("incident_corrective_actions_incident_idx").on(t.incident_id, t.status),
  ],
);

export const incidentRunbookExercises = pgTable(
  "incident_runbook_exercises",
  {
    runbook_exercise_id: uuid("runbook_exercise_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    scenario: text("scenario").notNull(),
    status: text("status").notNull().default("planned"),
    facilitator_principal_id: uuid("facilitator_principal_id").references(
      () => principals.principal_id,
    ),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    incident_id: uuid("incident_id").references(() => incidents.incident_id),
    gaps: jsonb("gaps")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    follow_ups: jsonb("follow_ups")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    evidence_ref: jsonb("evidence_ref").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "incident_runbook_exercises_scenario_check",
      sql`${t.scenario} IN ('cross_side_leakage','credential_compromise','monitoring_deadline_failure')`,
    ),
    index("incident_runbook_exercises_scenario_idx").on(t.scenario, t.created_at.desc()),
  ],
);

export type MonitoringSignalRow = typeof monitoringSignals.$inferSelect;
export type NewMonitoringSignalRow = typeof monitoringSignals.$inferInsert;
export type IncidentRow = typeof incidents.$inferSelect;
export type NewIncidentRow = typeof incidents.$inferInsert;
export type IncidentTimelineEntryRow = typeof incidentTimelineEntries.$inferSelect;
export type NewIncidentTimelineEntryRow = typeof incidentTimelineEntries.$inferInsert;
export type IncidentEvidenceReferenceRow = typeof incidentEvidenceReferences.$inferSelect;
export type NewIncidentEvidenceReferenceRow = typeof incidentEvidenceReferences.$inferInsert;
export type IncidentNotificationObligationRow = typeof incidentNotificationObligations.$inferSelect;
export type NewIncidentNotificationObligationRow =
  typeof incidentNotificationObligations.$inferInsert;
export type IncidentCorrectiveActionRow = typeof incidentCorrectiveActions.$inferSelect;
export type NewIncidentCorrectiveActionRow = typeof incidentCorrectiveActions.$inferInsert;
export type IncidentRunbookExerciseRow = typeof incidentRunbookExercises.$inferSelect;
export type NewIncidentRunbookExerciseRow = typeof incidentRunbookExercises.$inferInsert;
