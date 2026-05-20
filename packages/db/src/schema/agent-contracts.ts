// F07a — Immutable agent contract registry and publication evidence.
//
// schema-lint: skip-r2-timestamps
// Reason: contract versions and events are immutable compliance evidence.
// Contract changes create new versions or append event rows instead of
// mutating existing records.

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

export const AGENT_CONTRACT_SIDES = ["seeker", "employer"] as const;
export type AgentContractSide = (typeof AGENT_CONTRACT_SIDES)[number];

export const AGENT_CONTRACT_STATUSES = ["draft", "published", "deprecated", "retired"] as const;
export type AgentContractStatus = (typeof AGENT_CONTRACT_STATUSES)[number];

export const AGENT_CONTRACT_EVENT_TYPES = ["published", "deprecated"] as const;
export type AgentContractEventType = (typeof AGENT_CONTRACT_EVENT_TYPES)[number];

export const AGENT_CONTRACT_EVENT_REASON_CODES = [
  "initial_launch",
  "policy_update",
  "rubric_ref_update",
  "prompt_ref_update",
  "tool_surface_update",
  "model_update",
  "runtime_setting_update",
  "compliance_deprecation",
] as const;
export type AgentContractEventReasonCode = (typeof AGENT_CONTRACT_EVENT_REASON_CODES)[number];

export const agentContractVersions = pgTable(
  "agent_contract_versions",
  {
    agent_contract_version_id: uuid("agent_contract_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    contract_id: text("contract_id").notNull(),
    version: text("version").notNull(),
    side: text("side").notNull(),
    status: text("status").notNull(),
    prompt_template_ref: jsonb("prompt_template_ref")
      .$type<{ id: string; version: string }>()
      .notNull(),
    rubric_ref: jsonb("rubric_ref").$type<{ id: string; version: string }>().notNull(),
    tool_surface_ref: jsonb("tool_surface_ref").$type<{ id: string; version: string }>().notNull(),
    model_ref: jsonb("model_ref")
      .$type<{ provider: string; model_id: string; version: string }>()
      .notNull(),
    runtime_settings: jsonb("runtime_settings")
      .$type<{
        max_rounds?: number;
        timeout_ms?: number;
        max_tool_calls_per_turn?: number;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    extension_fields: jsonb("extension_fields")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    content_hash: text("content_hash").notNull(),
    description: text("description").notNull(),
    author_principal_id: uuid("author_principal_id")
      .notNull()
      .references(() => principals.principal_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    reviewer_principal_id: uuid("reviewer_principal_id").references(() => principals.principal_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    published_at: timestamp("published_at", { withTimezone: true }),
    deprecated_after: timestamp("deprecated_after", { withTimezone: true }),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("agent_contract_versions_contract_id_check", sql`${t.contract_id} <> ''`),
    check("agent_contract_versions_version_check", sql`${t.version} <> ''`),
    check("agent_contract_versions_side_check", sql`${t.side} IN ('seeker','employer')`),
    check(
      "agent_contract_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated','retired')`,
    ),
    check("agent_contract_versions_content_hash_check", sql`${t.content_hash} <> ''`),
    check("agent_contract_versions_description_check", sql`${t.description} <> ''`),
    check(
      "agent_contract_versions_published_shape_check",
      sql`${t.status} <> 'published' OR (${t.reviewer_principal_id} IS NOT NULL AND ${t.published_at} IS NOT NULL AND ${t.audit_event_id} IS NOT NULL)`,
    ),
    check(
      "agent_contract_versions_deprecated_shape_check",
      sql`${t.status} <> 'deprecated' OR ${t.deprecated_after} IS NOT NULL`,
    ),
    uniqueIndex("agent_contract_versions_ref_unique_idx").on(t.contract_id, t.version),
    uniqueIndex("agent_contract_versions_audit_event_idx")
      .on(t.audit_event_id)
      .where(sql`${t.audit_event_id} IS NOT NULL`),
    index("agent_contract_versions_side_status_idx").on(t.side, t.status, t.created_at.desc()),
  ],
);

export const agentContractEvents = pgTable(
  "agent_contract_events",
  {
    agent_contract_event_id: uuid("agent_contract_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    agent_contract_version_id: uuid("agent_contract_version_id")
      .notNull()
      .references(() => agentContractVersions.agent_contract_version_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    event_type: text("event_type").notNull(),
    reason_code: text("reason_code").notNull(),
    principal_id: uuid("principal_id")
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
      "agent_contract_events_event_type_check",
      sql`${t.event_type} IN ('published','deprecated')`,
    ),
    check(
      "agent_contract_events_reason_code_check",
      sql`${t.reason_code} IN ('initial_launch','policy_update','rubric_ref_update','prompt_ref_update','tool_surface_update','model_update','runtime_setting_update','compliance_deprecation')`,
    ),
    check("agent_contract_events_correlation_id_check", sql`${t.correlation_id} <> ''`),
    index("agent_contract_events_contract_idx").on(
      t.agent_contract_version_id,
      t.created_at.desc(),
    ),
    index("agent_contract_events_actor_idx").on(t.principal_id, t.created_at.desc()),
    uniqueIndex("agent_contract_events_audit_event_idx").on(t.audit_event_id),
  ],
);

export type AgentContractVersionRow = typeof agentContractVersions.$inferSelect;
export type NewAgentContractVersionRow = typeof agentContractVersions.$inferInsert;
export type AgentContractEventRow = typeof agentContractEvents.$inferSelect;
export type NewAgentContractEventRow = typeof agentContractEvents.$inferInsert;
