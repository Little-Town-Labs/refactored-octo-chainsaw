// F05 — Canonical audit log, tombstone evidence, and export manifests.
//
// schema-lint: skip-r2-timestamps
// Reason: these tables are append-only or tombstone-controlled evidence
// records. `updated_at` would imply ordinary mutable-row semantics; the
// only permitted mutation is the F05 tombstone procedure.

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

import { principals } from "./principals.js";

export const PRINCIPAL_KINDS = ["human", "agent", "service"] as const;
export type PrincipalKind = (typeof PRINCIPAL_KINDS)[number];

export const auditLogEvents = pgTable(
  "audit_log_events",
  {
    audit_event_id: uuid("audit_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    source_table: text("source_table"),
    source_event_id: uuid("source_event_id"),
    event_name: text("event_name").notNull(),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id, { onDelete: "no action", onUpdate: "no action" }),
    principal_kind: text("principal_kind").notNull(),
    role_or_scope: text("role_or_scope"),
    correlation_id: text("correlation_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    payload_hash: text("payload_hash").notNull(),
    previous_hash: text("previous_hash"),
    event_hash: text("event_hash").notNull(),
    chain_namespace: text("chain_namespace").notNull(),
    hash_algorithm: text("hash_algorithm").notNull(),
    canonicalization_version: text("canonicalization_version").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    tombstoned_at: timestamp("tombstoned_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "audit_log_events_principal_kind_check",
      sql`${t.principal_kind} IN ('human','agent','service')`,
    ),
    check(
      "audit_log_events_source_pair_check",
      sql`(${t.source_table} IS NULL) = (${t.source_event_id} IS NULL)`,
    ),
    check("audit_log_events_hash_algorithm_check", sql`${t.hash_algorithm} IN ('sha256')`),
    check(
      "audit_log_events_canonicalization_version_check",
      sql`${t.canonicalization_version} <> ''`,
    ),
    check(
      "audit_log_events_tombstone_payload_check",
      sql`${t.tombstoned_at} IS NULL OR ${t.payload} ? 'tombstone'`,
    ),
    uniqueIndex("audit_log_events_hash_idx").on(t.event_hash),
    uniqueIndex("audit_log_events_source_replay_idx")
      .on(t.source_table, t.source_event_id)
      .where(sql`${t.source_table} IS NOT NULL`),
    index("audit_log_events_chain_order_idx").on(t.chain_namespace, t.created_at, t.audit_event_id),
    index("audit_log_events_principal_idx").on(t.principal_id, t.created_at.desc()),
    index("audit_log_events_correlation_idx")
      .on(t.correlation_id, t.created_at.desc())
      .where(sql`${t.correlation_id} IS NOT NULL`),
  ],
);

export const TOMBSTONE_TARGET_KINDS = ["audit_event", "transcript_turn"] as const;
export type TombstoneTargetKind = (typeof TOMBSTONE_TARGET_KINDS)[number];

export const tombstoneRecords = pgTable(
  "tombstone_records",
  {
    tombstone_id: uuid("tombstone_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    target_kind: text("target_kind").notNull(),
    target_id: uuid("target_id").notNull(),
    subject_ref: text("subject_ref").notNull(),
    lawful_basis: text("lawful_basis").notNull(),
    procedure_version: text("procedure_version").notNull(),
    operator_principal_id: uuid("operator_principal_id")
      .notNull()
      .references(() => principals.principal_id, { onDelete: "no action", onUpdate: "no action" }),
    original_hash: text("original_hash").notNull(),
    replacement_hash: text("replacement_hash").notNull(),
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
      "tombstone_records_target_kind_check",
      sql`${t.target_kind} IN ('audit_event','transcript_turn')`,
    ),
    check(
      "tombstone_records_hashes_differ_check",
      sql`${t.original_hash} <> ${t.replacement_hash}`,
    ),
    uniqueIndex("tombstone_records_target_idx").on(t.target_kind, t.target_id),
    uniqueIndex("tombstone_records_audit_event_idx").on(t.audit_event_id),
    index("tombstone_records_operator_idx").on(t.operator_principal_id, t.created_at.desc()),
  ],
);

export const EVIDENCE_EXPORT_PURPOSES = [
  "incident",
  "counsel",
  "audit",
  "operator_review",
] as const;
export type EvidenceExportPurpose = (typeof EVIDENCE_EXPORT_PURPOSES)[number];

export const evidenceExports = pgTable(
  "evidence_exports",
  {
    export_id: uuid("export_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    requested_by_principal_id: uuid("requested_by_principal_id")
      .notNull()
      .references(() => principals.principal_id, { onDelete: "no action", onUpdate: "no action" }),
    purpose: text("purpose").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull(),
    manifest_hash: text("manifest_hash").notNull(),
    chain_verification_status: text("chain_verification_status").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "evidence_exports_purpose_check",
      sql`${t.purpose} IN ('incident','counsel','audit','operator_review')`,
    ),
    check(
      "evidence_exports_chain_status_check",
      sql`${t.chain_verification_status} IN ('valid','invalid') OR ${t.chain_verification_status} LIKE 'invalid:%'`,
    ),
    uniqueIndex("evidence_exports_manifest_hash_idx").on(t.manifest_hash),
    index("evidence_exports_requested_by_idx").on(t.requested_by_principal_id, t.created_at.desc()),
  ],
);

export type AuditLogEventRow = typeof auditLogEvents.$inferSelect;
export type NewAuditLogEventRow = typeof auditLogEvents.$inferInsert;
export type TombstoneRecordRow = typeof tombstoneRecords.$inferSelect;
export type NewTombstoneRecordRow = typeof tombstoneRecords.$inferInsert;
export type EvidenceExportRow = typeof evidenceExports.$inferSelect;
export type NewEvidenceExportRow = typeof evidenceExports.$inferInsert;
