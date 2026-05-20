// F11 — Candidate notification artifact system.
//
// schema-lint: skip-r2-timestamps
// Reason: notification templates, artifacts, gate events, and delivery
// commands are immutable compliance evidence. Changes append new rows.

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

export const NOTICE_CATEGORIES = [
  "advance_aedt_notice",
  "outcome_transparency",
  "inconclusive_outcome",
  "policy_update",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_TEMPLATE_STATUSES = ["draft", "published", "retired", "superseded"] as const;
export type NoticeTemplateStatus = (typeof NOTICE_TEMPLATE_STATUSES)[number];

export const NOTIFICATION_ARTIFACT_STATUSES = [
  "ready",
  "blocked",
  "superseded",
  "delivered_intent_created",
] as const;
export type NotificationArtifactStatus = (typeof NOTIFICATION_ARTIFACT_STATUSES)[number];

export const NOTIFICATION_GATE_DECISIONS = ["allowed", "refused"] as const;
export type NotificationGateDecision = (typeof NOTIFICATION_GATE_DECISIONS)[number];

export const CHANNEL_INTENTS = ["email", "telegram", "web", "a2a", "unspecified"] as const;
export type ChannelIntent = (typeof CHANNEL_INTENTS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  "pending",
  "claimed",
  "sent",
  "cancelled",
  "failed",
] as const;
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const candidateNoticeTemplateVersions = pgTable(
  "candidate_notice_template_versions",
  {
    notice_template_version_id: uuid("notice_template_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    template_id: text("template_id").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull(),
    notice_category: text("notice_category").notNull(),
    jurisdiction_scope: jsonb("jurisdiction_scope").$type<string[]>().notNull(),
    content_ref: text("content_ref").notNull(),
    content_hash: text("content_hash").notNull(),
    effective_from: timestamp("effective_from", { withTimezone: true }).notNull(),
    effective_until: timestamp("effective_until", { withTimezone: true }),
    published_at: timestamp("published_at", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("candidate_notice_template_versions_template_id_check", sql`${t.template_id} <> ''`),
    check("candidate_notice_template_versions_version_check", sql`${t.version} <> ''`),
    check(
      "candidate_notice_template_versions_status_check",
      sql`${t.status} IN ('draft','published','retired','superseded')`,
    ),
    check(
      "candidate_notice_template_versions_category_check",
      sql`${t.notice_category} IN ('advance_aedt_notice','outcome_transparency','inconclusive_outcome','policy_update')`,
    ),
    check("candidate_notice_template_versions_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("candidate_notice_template_versions_ref_unique_idx").on(t.template_id, t.version),
    index("candidate_notice_template_versions_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const candidateNotificationArtifacts = pgTable(
  "candidate_notification_artifacts",
  {
    artifact_id: uuid("artifact_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    match_id: uuid("match_id").notNull(),
    run_id: text("run_id").notNull(),
    dossier_id: uuid("dossier_id").notNull(),
    candidate_principal_id: uuid("candidate_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    notice_category: text("notice_category").notNull(),
    status: text("status").notNull(),
    template_id: text("template_id").notNull(),
    template_version: text("template_version").notNull(),
    jurisdiction_refs: jsonb("jurisdiction_refs").$type<string[]>().notNull(),
    policy_ref: jsonb("policy_ref").$type<{ policy_id: string; version: string }>().notNull(),
    timing: jsonb("timing").$type<Record<string, unknown>>().notNull(),
    content_refs: jsonb("content_refs").$type<string[]>().notNull(),
    content_hash: text("content_hash").notNull(),
    reason_code: text("reason_code").notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("candidate_notification_artifacts_run_id_check", sql`${t.run_id} <> ''`),
    check(
      "candidate_notification_artifacts_category_check",
      sql`${t.notice_category} IN ('advance_aedt_notice','outcome_transparency','inconclusive_outcome','policy_update')`,
    ),
    check(
      "candidate_notification_artifacts_status_check",
      sql`${t.status} IN ('ready','blocked','superseded','delivered_intent_created')`,
    ),
    check("candidate_notification_artifacts_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("candidate_notification_artifacts_dossier_category_idx").on(
      t.dossier_id,
      t.notice_category,
      t.template_id,
      t.template_version,
    ),
    index("candidate_notification_artifacts_match_idx").on(t.match_id, t.created_at.desc()),
  ],
);

export const candidateNotificationGateEvents = pgTable(
  "candidate_notification_gate_events",
  {
    gate_event_id: uuid("gate_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    artifact_id: uuid("artifact_id").references(() => candidateNotificationArtifacts.artifact_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    match_id: uuid("match_id").notNull(),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    evaluated_at: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    policy_ref: jsonb("policy_ref").$type<{ policy_id: string; version: string }>().notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "candidate_notification_gate_events_decision_check",
      sql`${t.decision} IN ('allowed','refused')`,
    ),
    check(
      "candidate_notification_gate_events_reason_code_check",
      sql`${t.reason_code} IN ('notice_ready','missing_artifact','artifact_blocked','template_not_published','template_superseded','not_yet_eligible','missing_recipient','invalid_payload','policy_blocked')`,
    ),
    index("candidate_notification_gate_events_match_idx").on(t.match_id, t.created_at.desc()),
    index("candidate_notification_gate_events_artifact_idx").on(t.artifact_id, t.created_at.desc()),
  ],
);

export const candidateNotificationDeliveryCommands = pgTable(
  "candidate_notification_delivery_commands",
  {
    command_id: uuid("command_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    artifact_id: uuid("artifact_id")
      .notNull()
      .references(() => candidateNotificationArtifacts.artifact_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    candidate_principal_id: uuid("candidate_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    notice_category: text("notice_category").notNull(),
    channel_intent: text("channel_intent").notNull(),
    idempotency_key: text("idempotency_key").notNull(),
    content_hash: text("content_hash").notNull(),
    delivery_window: jsonb("delivery_window").$type<Record<string, unknown>>().notNull(),
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
    check(
      "candidate_notification_delivery_commands_category_check",
      sql`${t.notice_category} IN ('advance_aedt_notice','outcome_transparency','inconclusive_outcome','policy_update')`,
    ),
    check(
      "candidate_notification_delivery_commands_channel_check",
      sql`${t.channel_intent} IN ('email','telegram','web','a2a','unspecified')`,
    ),
    check(
      "candidate_notification_delivery_commands_status_check",
      sql`${t.status} IN ('pending','claimed','sent','cancelled','failed')`,
    ),
    check("candidate_notification_delivery_commands_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("candidate_notification_delivery_commands_idempotency_idx").on(t.idempotency_key),
    index("candidate_notification_delivery_commands_artifact_idx").on(
      t.artifact_id,
      t.created_at.desc(),
    ),
  ],
);

export type NoticeTemplateVersionRow = typeof candidateNoticeTemplateVersions.$inferSelect;
export type NewCandidateNoticeTemplateVersionRow =
  typeof candidateNoticeTemplateVersions.$inferInsert;
export type CandidateNotificationArtifactRow = typeof candidateNotificationArtifacts.$inferSelect;
export type NewCandidateNotificationArtifactRow =
  typeof candidateNotificationArtifacts.$inferInsert;
export type NotificationGateEventRow = typeof candidateNotificationGateEvents.$inferSelect;
export type NewCandidateNotificationGateEventRow =
  typeof candidateNotificationGateEvents.$inferInsert;
export type NotificationDeliveryCommandRow =
  typeof candidateNotificationDeliveryCommands.$inferSelect;
export type NewCandidateNotificationDeliveryCommandRow =
  typeof candidateNotificationDeliveryCommands.$inferInsert;
