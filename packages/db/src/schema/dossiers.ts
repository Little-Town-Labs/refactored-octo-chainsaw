// F10 — Dossier builder, projection, signing, and verification evidence.
//
// schema-lint: skip-r2-timestamps
// Reason: dossier artifacts and verification rows are immutable compliance
// records. Changes create new artifact rows or append verification events.

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

export const DOSSIER_STATUSES = ["conclusive", "inconclusive"] as const;
export type DossierStatus = (typeof DOSSIER_STATUSES)[number];

export const DOSSIER_AUDIENCES = ["seeker", "employer", "auditor", "a2a_receiver"] as const;
export type DossierAudience = (typeof DOSSIER_AUDIENCES)[number];

export const DOSSIER_VERIFICATION_DECISIONS = ["valid", "invalid"] as const;
export type DossierVerificationDecision = (typeof DOSSIER_VERIFICATION_DECISIONS)[number];

export const dossierArtifacts = pgTable(
  "dossier_artifacts",
  {
    dossier_id: uuid("dossier_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    run_id: text("run_id").notNull(),
    match_id: uuid("match_id").notNull(),
    status: text("status").notNull(),
    contract_refs: jsonb("contract_refs")
      .$type<Record<string, { contract_id: string; version: string }>>()
      .notNull(),
    privacy_ruleset_refs: jsonb("privacy_ruleset_refs")
      .$type<Array<{ ruleset_id: string; version: string }>>()
      .notNull(),
    harness_version: text("harness_version").notNull(),
    model_invocation_refs: jsonb("model_invocation_refs").$type<string[]>().notNull(),
    rubric_breakdowns: jsonb("rubric_breakdowns").$type<unknown[]>().notNull(),
    rationales: jsonb("rationales").$type<Record<string, string>>().notNull(),
    reconciled_flags: jsonb("reconciled_flags").$type<unknown[]>().notNull(),
    inconclusive_flags: jsonb("inconclusive_flags").$type<unknown[]>().notNull(),
    projection_refs: jsonb("projection_refs").$type<Record<string, string>>().notNull(),
    content_hash: text("content_hash").notNull(),
    signature: jsonb("signature").$type<Record<string, unknown> | null>(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("dossier_artifacts_run_id_check", sql`${t.run_id} <> ''`),
    check("dossier_artifacts_status_check", sql`${t.status} IN ('conclusive','inconclusive')`),
    check("dossier_artifacts_harness_version_check", sql`${t.harness_version} <> ''`),
    check("dossier_artifacts_hash_check", sql`${t.content_hash} <> ''`),
    uniqueIndex("dossier_artifacts_run_unique_idx").on(t.run_id),
    index("dossier_artifacts_status_idx").on(t.status, t.created_at.desc()),
  ],
);

export const dossierProjections = pgTable(
  "dossier_projections",
  {
    projection_id: uuid("projection_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    dossier_id: uuid("dossier_id")
      .notNull()
      .references(() => dossierArtifacts.dossier_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    audience: text("audience").notNull(),
    disclosure_stage: text("disclosure_stage").notNull(),
    ruleset_id: text("ruleset_id").notNull(),
    ruleset_version: text("ruleset_version").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    payload_hash: text("payload_hash").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "dossier_projections_audience_check",
      sql`${t.audience} IN ('seeker','employer','auditor','a2a_receiver')`,
    ),
    check("dossier_projections_stage_check", sql`${t.disclosure_stage} <> ''`),
    check("dossier_projections_hash_check", sql`${t.payload_hash} <> ''`),
    uniqueIndex("dossier_projections_dossier_audience_idx").on(t.dossier_id, t.audience),
    index("dossier_projections_dossier_idx").on(t.dossier_id, t.created_at.desc()),
  ],
);

export const dossierSignatures = pgTable(
  "dossier_signatures",
  {
    signature_id: uuid("signature_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    dossier_id: uuid("dossier_id")
      .notNull()
      .references(() => dossierArtifacts.dossier_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    algorithm: text("algorithm").notNull(),
    kid: text("kid").notNull(),
    canonicalization_version: text("canonicalization_version").notNull(),
    signed_content_hash: text("signed_content_hash").notNull(),
    signature: text("signature").notNull(),
    signed_at: timestamp("signed_at", { withTimezone: true }).notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("dossier_signatures_algorithm_check", sql`${t.algorithm} IN ('Ed25519')`),
    check("dossier_signatures_kid_check", sql`${t.kid} <> ''`),
    check("dossier_signatures_hash_check", sql`${t.signed_content_hash} <> ''`),
    uniqueIndex("dossier_signatures_dossier_idx").on(t.dossier_id),
  ],
);

export const dossierVerificationEvents = pgTable(
  "dossier_verification_events",
  {
    verification_id: uuid("verification_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    dossier_id: uuid("dossier_id")
      .notNull()
      .references(() => dossierArtifacts.dossier_id, {
        onDelete: "no action",
        onUpdate: "no action",
      }),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    kid: text("kid"),
    content_hash: text("content_hash").notNull(),
    audit_event_id: uuid("audit_event_id").references(() => auditLogEvents.audit_event_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("dossier_verification_events_decision_check", sql`${t.decision} IN ('valid','invalid')`),
    check(
      "dossier_verification_events_reason_code_check",
      sql`${t.reason_code} IN ('signature_valid','signature_invalid','unknown_key','signing_disabled','missing_projection','invalid_payload','inconclusive')`,
    ),
    check("dossier_verification_events_hash_check", sql`${t.content_hash} <> ''`),
    index("dossier_verification_events_dossier_idx").on(t.dossier_id, t.created_at.desc()),
  ],
);

export type DossierArtifactRow = typeof dossierArtifacts.$inferSelect;
export type NewDossierArtifactRow = typeof dossierArtifacts.$inferInsert;
export type DossierProjectionRow = typeof dossierProjections.$inferSelect;
export type NewDossierProjectionRow = typeof dossierProjections.$inferInsert;
export type DossierSignatureRow = typeof dossierSignatures.$inferSelect;
export type NewDossierSignatureRow = typeof dossierSignatures.$inferInsert;
export type DossierVerificationEventRow = typeof dossierVerificationEvents.$inferSelect;
export type NewDossierVerificationEventRow = typeof dossierVerificationEvents.$inferInsert;
