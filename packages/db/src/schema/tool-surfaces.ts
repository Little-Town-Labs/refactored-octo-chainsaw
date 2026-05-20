// F08.5 — Tool surface registry and dispatcher evidence.
//
// schema-lint: skip-r2-timestamps
// Reason: tool catalog versions and dispatch evidence are immutable compliance
// records. Changes create new versions or append event rows instead of mutating
// existing evidence.

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

export const TOOL_SURFACE_SIDES = ["seeker", "employer", "both"] as const;
export type ToolSurfaceSide = (typeof TOOL_SURFACE_SIDES)[number];

export const TOOL_STATUSES = ["draft", "published", "deprecated"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

export const DISCLOSURE_CLASSES = [
  "principal_self",
  "counterparty_filtered",
  "platform_open",
] as const;
export type DisclosureClass = (typeof DISCLOSURE_CLASSES)[number];

export const TOOL_DISPATCH_STATUSES = [
  "ok",
  "tool_unsupported",
  "denied",
  "filtered_pending",
  "adapter_failed",
  "adapter_timeout",
  "schema_invalid",
] as const;
export type ToolDispatchStatus = (typeof TOOL_DISPATCH_STATUSES)[number];

export const TOOL_DISPATCH_REASON_CODES = [
  "tool_dispatch_allowed",
  "tool_surface_missing",
  "tool_surface_unpublished",
  "tool_surface_deprecated",
  "tool_surface_invalid",
  "tool_adapter_unavailable",
  "tool_unsupported",
  "tool_scope_denied",
  "tool_call_limit_exceeded",
  "tool_input_schema_invalid",
  "tool_output_schema_invalid",
  "tool_adapter_failed",
  "tool_adapter_timeout",
  "tool_privacy_filter_required",
  "tool_privacy_filter_unavailable",
  "dispatcher_bypass_detected",
] as const;
export type ToolDispatchReasonCode = (typeof TOOL_DISPATCH_REASON_CODES)[number];

export const toolDescriptorVersions = pgTable(
  "tool_descriptor_versions",
  {
    tool_descriptor_id: uuid("tool_descriptor_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text("name").notNull(),
    version: text("version").notNull(),
    input_schema: jsonb("input_schema").$type<Record<string, unknown>>().notNull(),
    output_schema: jsonb("output_schema").$type<Record<string, unknown>>().notNull(),
    disclosure_class: text("disclosure_class").notNull(),
    adapter_ref: text("adapter_ref").notNull(),
    status: text("status").notNull(),
    description: text("description").notNull(),
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
    check("tool_descriptor_versions_name_check", sql`${t.name} <> ''`),
    check("tool_descriptor_versions_version_check", sql`${t.version} <> ''`),
    check(
      "tool_descriptor_versions_disclosure_check",
      sql`${t.disclosure_class} IN ('principal_self','counterparty_filtered','platform_open')`,
    ),
    check("tool_descriptor_versions_adapter_ref_check", sql`${t.adapter_ref} <> ''`),
    check(
      "tool_descriptor_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated')`,
    ),
    check("tool_descriptor_versions_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("tool_descriptor_versions_ref_unique_idx").on(t.name, t.version),
    index("tool_descriptor_versions_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const toolSurfaceVersions = pgTable(
  "tool_surface_versions",
  {
    tool_surface_version_id: uuid("tool_surface_version_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    surface_id: text("surface_id").notNull(),
    version: text("version").notNull(),
    side_scope: text("side_scope").notNull(),
    status: text("status").notNull(),
    description: text("description").notNull(),
    descriptor_refs: jsonb("descriptor_refs")
      .$type<
        Array<{ name: string; version: string; required: boolean; advertisement_order: number }>
      >()
      .notNull(),
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
    check("tool_surface_versions_surface_id_check", sql`${t.surface_id} <> ''`),
    check("tool_surface_versions_version_check", sql`${t.version} <> ''`),
    check("tool_surface_versions_side_check", sql`${t.side_scope} IN ('seeker','employer','both')`),
    check(
      "tool_surface_versions_status_check",
      sql`${t.status} IN ('draft','published','deprecated')`,
    ),
    check(
      "tool_surface_versions_descriptors_check",
      sql`jsonb_array_length(${t.descriptor_refs}) > 0`,
    ),
    check("tool_surface_versions_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("tool_surface_versions_ref_unique_idx").on(t.surface_id, t.version),
    index("tool_surface_versions_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const toolSurfaceEvents = pgTable(
  "tool_surface_events",
  {
    tool_surface_event_id: uuid("tool_surface_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    subject_kind: text("subject_kind").notNull(),
    subject_ref: text("subject_ref").notNull(),
    event_type: text("event_type").notNull(),
    reason_code: text("reason_code").notNull(),
    principal_id: uuid("principal_id").notNull(),
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
    check("tool_surface_events_subject_ref_check", sql`${t.subject_ref} <> ''`),
    check("tool_surface_events_reason_code_check", sql`${t.reason_code} <> ''`),
    check("tool_surface_events_correlation_id_check", sql`${t.correlation_id} <> ''`),
    index("tool_surface_events_subject_idx").on(t.subject_kind, t.subject_ref, t.created_at.desc()),
    uniqueIndex("tool_surface_events_audit_event_idx").on(t.audit_event_id),
  ],
);

export const toolDispatchEvents = pgTable(
  "tool_dispatch_events",
  {
    tool_dispatch_event_id: uuid("tool_dispatch_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    run_id: text("run_id").notNull(),
    turn_id: text("turn_id").notNull(),
    side: text("side").notNull(),
    surface_id: text("surface_id").notNull(),
    surface_version: text("surface_version").notNull(),
    tool_name: text("tool_name").notNull(),
    tool_version: text("tool_version").notNull(),
    status: text("status").notNull(),
    reason_code: text("reason_code").notNull(),
    disclosure_class: text("disclosure_class").notNull(),
    audit_event_id: uuid("audit_event_id")
      .notNull()
      .references(() => auditLogEvents.audit_event_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    correlation_id: text("correlation_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("tool_dispatch_events_run_id_check", sql`${t.run_id} <> ''`),
    check(
      "tool_dispatch_events_status_check",
      sql`${t.status} IN ('ok','tool_unsupported','denied','filtered_pending','adapter_failed','adapter_timeout','schema_invalid')`,
    ),
    check("tool_dispatch_events_reason_code_check", sql`${t.reason_code} <> ''`),
    index("tool_dispatch_events_run_idx").on(t.run_id, t.created_at.desc()),
    index("tool_dispatch_events_reason_idx").on(t.reason_code, t.created_at.desc()),
  ],
);

export const disclosureRoutingEvidence = pgTable("disclosure_routing_evidence", {
  routing_id: uuid("routing_id")
    .primaryKey()
    .default(sql`uuidv7()`),
  dispatch_event_id: uuid("dispatch_event_id")
    .notNull()
    .references(() => toolDispatchEvents.tool_dispatch_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
  disclosure_class: text("disclosure_class").notNull(),
  route: text("route").notNull(),
  privacy_filter_ref: text("privacy_filter_ref"),
  audit_event_id: uuid("audit_event_id")
    .notNull()
    .references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const dispatcherBypassFindings = pgTable("dispatcher_bypass_findings", {
  finding_id: uuid("finding_id")
    .primaryKey()
    .default(sql`uuidv7()`),
  source_path: text("source_path").notNull(),
  forbidden_import: text("forbidden_import").notNull(),
  detected_by: text("detected_by").notNull(),
  status: text("status").notNull(),
  audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
    onDelete: "no action",
    onUpdate: "no action",
  }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type ToolDescriptorVersionRow = typeof toolDescriptorVersions.$inferSelect;
export type NewToolDescriptorVersionRow = typeof toolDescriptorVersions.$inferInsert;
export type ToolSurfaceVersionRow = typeof toolSurfaceVersions.$inferSelect;
export type NewToolSurfaceVersionRow = typeof toolSurfaceVersions.$inferInsert;
export type ToolSurfaceEventRow = typeof toolSurfaceEvents.$inferSelect;
export type NewToolSurfaceEventRow = typeof toolSurfaceEvents.$inferInsert;
export type ToolDispatchEventRow = typeof toolDispatchEvents.$inferSelect;
export type NewToolDispatchEventRow = typeof toolDispatchEvents.$inferInsert;
export type DisclosureRoutingEvidenceRow = typeof disclosureRoutingEvidence.$inferSelect;
export type NewDisclosureRoutingEvidenceRow = typeof disclosureRoutingEvidence.$inferInsert;
export type DispatcherBypassFindingRow = typeof dispatcherBypassFindings.$inferSelect;
export type NewDispatcherBypassFindingRow = typeof dispatcherBypassFindings.$inferInsert;
