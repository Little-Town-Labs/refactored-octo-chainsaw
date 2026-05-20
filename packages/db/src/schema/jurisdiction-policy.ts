// F06 — Jurisdiction policy posture, gate decisions, and kill-switch evidence.
//
// schema-lint: skip-r2-timestamps
// Reason: these tables are revisioned or append-only compliance evidence.
// `updated_at` would imply ordinary mutable-row semantics; posture changes
// create new revisions and evidence rows instead.

import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditLogEvents } from "./audit-log.js";
import { principals } from "./principals.js";

export const JURISDICTION_POLICY_STATUSES = [
  "allowed",
  "unsupported",
  "disabled",
  "review_required",
  "retired",
] as const;
export type JurisdictionPolicyStatus = (typeof JURISDICTION_POLICY_STATUSES)[number];

export const JURISDICTION_GATE_SUBJECT_KINDS = [
  "seeker_ticket",
  "employer_req_ticket",
  "match_ticket",
  "run_dispatch",
] as const;
export type JurisdictionGateSubjectKind = (typeof JURISDICTION_GATE_SUBJECT_KINDS)[number];

export const JURISDICTION_GATE_DECISIONS = ["allow", "deny"] as const;
export type JurisdictionGateDecision = (typeof JURISDICTION_GATE_DECISIONS)[number];

export const JURISDICTION_GATE_REASON_CODES = [
  "all_allowed",
  "missing_jurisdiction",
  "unknown_jurisdiction",
  "unsupported_jurisdiction",
  "disabled_jurisdiction",
  "review_required",
  "expired_policy",
  "conflicting_jurisdictions",
  "unauthorized",
] as const;
export type JurisdictionGateReasonCode = (typeof JURISDICTION_GATE_REASON_CODES)[number];

export const JURISDICTION_KILL_SWITCH_REASON_CODES = [
  "new_regulation",
  "counsel_directive",
  "incident_response",
  "bias_audit_gap",
  "launch_posture",
  "manual_reenable",
] as const;
export type JurisdictionKillSwitchReasonCode =
  (typeof JURISDICTION_KILL_SWITCH_REASON_CODES)[number];

export const jurisdictionPolicies = pgTable(
  "jurisdiction_policies",
  {
    jurisdiction_policy_id: uuid("jurisdiction_policy_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    jurisdiction_code: text("jurisdiction_code").notNull(),
    status: text("status").notNull(),
    policy_version: text("policy_version").notNull(),
    effective_from: timestamp("effective_from", { withTimezone: true }).notNull(),
    effective_until: timestamp("effective_until", { withTimezone: true }),
    operational_reason: text("operational_reason").notNull(),
    reviewer_principal_id: uuid("reviewer_principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_by_principal_id: uuid("created_by_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "jurisdiction_policies_status_check",
      sql`${t.status} IN ('allowed','unsupported','disabled','review_required','retired')`,
    ),
    check(
      "jurisdiction_policies_jurisdiction_code_check",
      sql`${t.jurisdiction_code} ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'`,
    ),
    check("jurisdiction_policies_policy_version_check", sql`${t.policy_version} <> ''`),
    check(
      "jurisdiction_policies_effective_window_check",
      sql`${t.effective_until} IS NULL OR ${t.effective_until} > ${t.effective_from}`,
    ),
    check("jurisdiction_policies_operational_reason_check", sql`${t.operational_reason} <> ''`),
    uniqueIndex("jurisdiction_policies_active_unique_idx")
      .on(t.jurisdiction_code)
      .where(sql`${t.effective_until} IS NULL`),
    index("jurisdiction_policies_effective_idx").on(t.jurisdiction_code, t.effective_from.desc()),
  ],
);

export const jurisdictionGateDecisions = pgTable(
  "jurisdiction_gate_decisions",
  {
    gate_decision_id: uuid("gate_decision_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    subject_kind: text("subject_kind").notNull(),
    subject_id: text("subject_id").notNull(),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    jurisdiction_codes: jsonb("jurisdiction_codes").$type<string[]>().notNull(),
    policy_version: text("policy_version").notNull(),
    policy_revision_ids: jsonb("policy_revision_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    correlation_id: text("correlation_id").notNull(),
    principal_id: uuid("principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    audit_event_id: uuid("audit_event_id")
      .notNull()
      .references(() => auditLogEvents.audit_event_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "jurisdiction_gate_decisions_subject_kind_check",
      sql`${t.subject_kind} IN ('seeker_ticket','employer_req_ticket','match_ticket','run_dispatch')`,
    ),
    check("jurisdiction_gate_decisions_decision_check", sql`${t.decision} IN ('allow','deny')`),
    check(
      "jurisdiction_gate_decisions_reason_code_check",
      sql`${t.reason_code} IN ('all_allowed','missing_jurisdiction','unknown_jurisdiction','unsupported_jurisdiction','disabled_jurisdiction','review_required','expired_policy','conflicting_jurisdictions','unauthorized')`,
    ),
    check(
      "jurisdiction_gate_decisions_allow_reason_check",
      sql`${t.decision} <> 'allow' OR ${t.reason_code} = 'all_allowed'`,
    ),
    check(
      "jurisdiction_gate_decisions_deny_reason_check",
      sql`${t.decision} <> 'deny' OR ${t.reason_code} <> 'all_allowed'`,
    ),
    check(
      "jurisdiction_gate_decisions_jurisdictions_shape_check",
      sql`jsonb_typeof(${t.jurisdiction_codes}) = 'array' AND (${t.reason_code} = 'missing_jurisdiction' OR jsonb_array_length(${t.jurisdiction_codes}) >= 1)`,
    ),
    check(
      "jurisdiction_gate_decisions_policy_revision_ids_array",
      sql`jsonb_typeof(${t.policy_revision_ids}) = 'array'`,
    ),
    index("jurisdiction_gate_decisions_correlation_idx").on(t.correlation_id, t.created_at.desc()),
    index("jurisdiction_gate_decisions_subject_idx").on(
      t.subject_kind,
      t.subject_id,
      t.created_at.desc(),
    ),
    index("jurisdiction_gate_decisions_jurisdictions_idx").using("gin", t.jurisdiction_codes),
    index("jurisdiction_gate_decisions_principal_idx")
      .on(t.principal_id, t.created_at.desc())
      .where(sql`${t.principal_id} IS NOT NULL`),
    uniqueIndex("jurisdiction_gate_decisions_audit_event_idx").on(t.audit_event_id),
  ],
);

export const jurisdictionKillSwitchEvents = pgTable(
  "jurisdiction_kill_switch_events",
  {
    kill_switch_event_id: uuid("kill_switch_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    jurisdiction_code: text("jurisdiction_code").notNull(),
    from_status: text("from_status").notNull(),
    to_status: text("to_status").notNull(),
    reason_code: text("reason_code").notNull(),
    policy_version: text("policy_version").notNull(),
    operator_principal_id: uuid("operator_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    reviewer_principal_id: uuid("reviewer_principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    correlation_id: text("correlation_id").notNull(),
    audit_event_id: uuid("audit_event_id")
      .notNull()
      .references(() => auditLogEvents.audit_event_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "jurisdiction_kill_switch_events_jurisdiction_code_check",
      sql`${t.jurisdiction_code} ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'`,
    ),
    check(
      "jurisdiction_kill_switch_events_from_status_check",
      sql`${t.from_status} IN ('allowed','unsupported','disabled','review_required','retired')`,
    ),
    check(
      "jurisdiction_kill_switch_events_to_status_check",
      sql`${t.to_status} IN ('allowed','unsupported','disabled','review_required','retired')`,
    ),
    check(
      "jurisdiction_kill_switch_events_status_changed_check",
      sql`${t.from_status} <> ${t.to_status}`,
    ),
    check(
      "jurisdiction_kill_switch_events_reason_code_check",
      sql`${t.reason_code} IN ('new_regulation','counsel_directive','incident_response','bias_audit_gap','launch_posture','manual_reenable')`,
    ),
    index("jurisdiction_kill_switch_events_jurisdiction_idx").on(
      t.jurisdiction_code,
      t.created_at.desc(),
    ),
    index("jurisdiction_kill_switch_events_operator_idx").on(
      t.operator_principal_id,
      t.created_at.desc(),
    ),
    uniqueIndex("jurisdiction_kill_switch_events_audit_event_idx").on(t.audit_event_id),
  ],
);

export type JurisdictionPolicyRow = typeof jurisdictionPolicies.$inferSelect;
export type NewJurisdictionPolicyRow = typeof jurisdictionPolicies.$inferInsert;
export type JurisdictionGateDecisionRow = typeof jurisdictionGateDecisions.$inferSelect;
export type NewJurisdictionGateDecisionRow = typeof jurisdictionGateDecisions.$inferInsert;
export type JurisdictionKillSwitchEventRow = typeof jurisdictionKillSwitchEvents.$inferSelect;
export type NewJurisdictionKillSwitchEventRow = typeof jurisdictionKillSwitchEvents.$inferInsert;
