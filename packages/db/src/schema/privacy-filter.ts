// F09 — Privacy filter rulesets, decisions, sentinel failures, and access findings.
//
// schema-lint: skip-r2-timestamps
// Reason: privacy rulesets and filter evidence are immutable compliance records.
// Changes create new versions or append evidence rows instead of mutating history.

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditLogEvents } from "./audit-log.js";

export const PRIVACY_AUDIENCES = ["seeker", "employer", "platform"] as const;
export type PrivacyAudience = (typeof PRIVACY_AUDIENCES)[number];

export const PRIVACY_RULESET_STATUSES = ["draft", "published", "deprecated"] as const;
export type PrivacyRulesetStatus = (typeof PRIVACY_RULESET_STATUSES)[number];

export const PRIVACY_INPUT_CLASSES = [
  "seeker_resume",
  "employer_req",
  "ats_import",
  "tool_returned",
  "a2a_received",
] as const;
export type PrivacyInputClass = (typeof PRIVACY_INPUT_CLASSES)[number];

export const PRIVACY_FILTER_DECISIONS = ["allow", "redact", "refuse"] as const;
export type PrivacyFilterDecision = (typeof PRIVACY_FILTER_DECISIONS)[number];

export const PRIVACY_FINDING_STATUSES = ["open", "resolved", "expected_fixture"] as const;
export type PrivacyFindingStatus = (typeof PRIVACY_FINDING_STATUSES)[number];

export const privacyRulesetVersions = pgTable(
  "privacy_ruleset_versions",
  {
    privacy_ruleset_version_id: uuid("privacy_ruleset_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    ruleset_id: text("ruleset_id").notNull(),
    version: text("version").notNull(),
    audience: text("audience").notNull(),
    status: text("status").notNull(),
    disclosure_stages: jsonb("disclosure_stages")
      .$type<Array<{ stage: string; order: number; allowed_fields: string[] }>>()
      .notNull(),
    allowed_fields: jsonb("allowed_fields").$type<string[]>().notNull(),
    redaction_rules: jsonb("redaction_rules")
      .$type<Array<{ category: string; pattern: string }>>()
      .notNull(),
    refusal_rules: jsonb("refusal_rules")
      .$type<Array<{ category: string; reason_code: string }>>()
      .notNull(),
    max_input_chars: integer("max_input_chars").notNull(),
    content_hash: text("content_hash").notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    deprecated_at: timestamp("deprecated_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("privacy_ruleset_versions_ruleset_id_check", sql`${t.ruleset_id} <> ''`),
    check("privacy_ruleset_versions_version_check", sql`${t.version} <> ''`),
    check(
      "privacy_ruleset_versions_audience_check",
      sql`${t.audience} IN ('seeker','employer','platform')`,
    ),
    check(
      "privacy_ruleset_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated')`,
    ),
    check(
      "privacy_ruleset_versions_stages_check",
      sql`jsonb_array_length(${t.disclosure_stages}) > 0`,
    ),
    check("privacy_ruleset_versions_max_chars_check", sql`${t.max_input_chars} > 0`),
    check("privacy_ruleset_versions_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("privacy_ruleset_versions_ref_unique_idx").on(t.ruleset_id, t.version),
    index("privacy_ruleset_versions_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const privacyFilterDecisions = pgTable(
  "privacy_filter_decisions",
  {
    filter_decision_id: uuid("filter_decision_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    run_id: text("run_id").notNull(),
    ruleset_id: text("ruleset_id").notNull(),
    ruleset_version: text("ruleset_version").notNull(),
    audience: text("audience").notNull(),
    disclosure_stage: text("disclosure_stage").notNull(),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    redaction_summary: jsonb("redaction_summary").$type<Record<string, number>>().notNull(),
    source_content_hash: text("source_content_hash").notNull(),
    filtered_view_ref: text("filtered_view_ref"),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("privacy_filter_decisions_run_id_check", sql`${t.run_id} <> ''`),
    check(
      "privacy_filter_decisions_audience_check",
      sql`${t.audience} IN ('seeker','employer','platform')`,
    ),
    check(
      "privacy_filter_decisions_decision_check",
      sql`${t.decision} IN ('allow','redact','refuse')`,
    ),
    check(
      "privacy_filter_decisions_reason_code_check",
      sql`${t.reason_code} IN ('privacy_allowed','privacy_redacted','privacy_refused','privacy_ruleset_missing','privacy_ruleset_unpublished','privacy_ruleset_invalid','privacy_payload_oversized','privacy_unsupported_input_class','privacy_all_content_redacted','sentinel_missing','sentinel_mismatch','sentinel_duplicate','sentinel_injection_detected','counterparty_access_bypass_detected')`,
    ),
    check("privacy_filter_decisions_hash_check", sql`${t.source_content_hash} <> ''`),
    index("privacy_filter_decisions_run_idx").on(t.run_id, t.created_at.desc()),
    index("privacy_filter_decisions_reason_idx").on(t.reason_code, t.created_at.desc()),
  ],
);

export const sentinelFailures = pgTable(
  "sentinel_failures",
  {
    sentinel_failure_id: uuid("sentinel_failure_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    run_id: text("run_id").notNull(),
    input_class: text("input_class").notNull(),
    reason_code: text("reason_code").notNull(),
    source_content_hash: text("source_content_hash").notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("sentinel_failures_run_id_check", sql`${t.run_id} <> ''`),
    check(
      "sentinel_failures_input_class_check",
      sql`${t.input_class} IN ('seeker_resume','employer_req','ats_import','tool_returned','a2a_received')`,
    ),
    check(
      "sentinel_failures_reason_code_check",
      sql`${t.reason_code} IN ('sentinel_missing','sentinel_mismatch','sentinel_duplicate','sentinel_injection_detected')`,
    ),
    check("sentinel_failures_hash_check", sql`${t.source_content_hash} <> ''`),
    index("sentinel_failures_run_idx").on(t.run_id, t.created_at.desc()),
  ],
);

export const counterpartyAccessFindings = pgTable(
  "counterparty_access_findings",
  {
    finding_id: uuid("finding_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    source_path: text("source_path").notNull(),
    forbidden_access: text("forbidden_access").notNull(),
    detected_by: text("detected_by").notNull(),
    status: text("status").notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("counterparty_access_findings_path_check", sql`${t.source_path} <> ''`),
    check("counterparty_access_findings_access_check", sql`${t.forbidden_access} <> ''`),
    check("counterparty_access_findings_detected_by_check", sql`${t.detected_by} <> ''`),
    check(
      "counterparty_access_findings_status_check",
      sql`${t.status} IN ('open','resolved','expected_fixture')`,
    ),
    index("counterparty_access_findings_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export type PrivacyRulesetVersionRow = typeof privacyRulesetVersions.$inferSelect;
export type NewPrivacyRulesetVersionRow = typeof privacyRulesetVersions.$inferInsert;
export type PrivacyFilterDecisionRow = typeof privacyFilterDecisions.$inferSelect;
export type NewPrivacyFilterDecisionRow = typeof privacyFilterDecisions.$inferInsert;
export type SentinelFailureRow = typeof sentinelFailures.$inferSelect;
export type NewSentinelFailureRow = typeof sentinelFailures.$inferInsert;
export type CounterpartyAccessFindingRow = typeof counterpartyAccessFindings.$inferSelect;
export type NewCounterpartyAccessFindingRow = typeof counterpartyAccessFindings.$inferInsert;
