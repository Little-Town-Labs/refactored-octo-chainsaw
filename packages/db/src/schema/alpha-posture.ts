// F25 — Phase 0 alpha posture infrastructure.

import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { principals } from "./principals.js";

export const ALPHA_PARTICIPANT_ROLES = ["seeker", "employer"] as const;
export type AlphaParticipantRole = (typeof ALPHA_PARTICIPANT_ROLES)[number];

export const ALPHA_CONSENT_STATES = ["consented", "declined", "withdrawn", "expired"] as const;
export type AlphaConsentState = (typeof ALPHA_CONSENT_STATES)[number];

export const ALPHA_HUMAN_REVIEW_DECISIONS = ["approved", "rejected", "needs_changes"] as const;
export type AlphaHumanReviewDecision = (typeof ALPHA_HUMAN_REVIEW_DECISIONS)[number];

export const alphaConsentRecords = pgTable(
  "alpha_consent_records",
  {
    alpha_consent_id: uuid("alpha_consent_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    participant_role: text("participant_role").notNull(),
    principal_id: uuid("principal_id")
      .notNull()
      .references(() => principals.principal_id),
    org_id: uuid("org_id"),
    consent_version: text("consent_version").notNull(),
    state: text("state").notNull(),
    evidence_ref: text("evidence_ref").notNull(),
    recorded_at: timestamp("recorded_at", { withTimezone: true }).notNull(),
    withdrawn_at: timestamp("withdrawn_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("alpha_consent_records_role_check", sql`${t.participant_role} IN ('seeker','employer')`),
    check(
      "alpha_consent_records_state_check",
      sql`${t.state} IN ('consented','declined','withdrawn','expired')`,
    ),
    check("alpha_consent_records_version_check", sql`${t.consent_version} <> ''`),
    index("alpha_consent_records_principal_idx").on(t.principal_id, t.created_at.desc()),
  ],
);

export const alphaHumanReviewDecisions = pgTable(
  "alpha_human_review_decisions",
  {
    alpha_human_review_id: uuid("alpha_human_review_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    match_id: uuid("match_id").notNull(),
    dossier_id: uuid("dossier_id").notNull(),
    reviewer_principal_id: uuid("reviewer_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    evidence_ref: text("evidence_ref").notNull(),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "alpha_human_review_decisions_decision_check",
      sql`${t.decision} IN ('approved','rejected','needs_changes')`,
    ),
    check("alpha_human_review_decisions_reason_check", sql`${t.reason} <> ''`),
    index("alpha_human_review_decisions_match_idx").on(t.match_id, t.created_at.desc()),
  ],
);

export const alphaCounselEvidenceReferences = pgTable(
  "alpha_counsel_evidence_references",
  {
    alpha_counsel_evidence_id: uuid("alpha_counsel_evidence_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    phase: text("phase").notNull(),
    transition: text("transition").notNull(),
    memo_path: text("memo_path").notNull(),
    reviewer: text("reviewer").notNull(),
    signed: boolean("signed").notNull(),
    dated_on: text("dated_on").notNull(),
    evidence_hash: text("evidence_hash"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("alpha_counsel_evidence_refs_phase_check", sql`${t.phase} IN ('phase_0','phase_1')`),
    check(
      "alpha_counsel_evidence_refs_transition_check",
      sql`${t.transition} IN ('phase_0_to_phase_1','phase_0_entry')`,
    ),
    check(
      "alpha_counsel_evidence_refs_path_check",
      sql`${t.memo_path} LIKE '.specify/memory/counsel-reviews/%'`,
    ),
    check("alpha_counsel_evidence_refs_signed_check", sql`${t.signed} = true`),
    index("alpha_counsel_evidence_refs_transition_idx").on(t.transition, t.created_at.desc()),
  ],
);

export const alphaPostureGateDecisions = pgTable(
  "alpha_posture_gate_decisions",
  {
    alpha_posture_gate_decision_id: uuid("alpha_posture_gate_decision_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    decision: text("decision").notNull(),
    reason_code: text("reason_code").notNull(),
    checked_at: timestamp("checked_at", { withTimezone: true }).notNull(),
    consent_refs: jsonb("consent_refs").$type<string[]>().notNull(),
    human_review_ref: text("human_review_ref"),
    counsel_evidence_ref: text("counsel_evidence_ref"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("alpha_posture_gate_decisions_decision_check", sql`${t.decision} IN ('allow','block')`),
    check("alpha_posture_gate_decisions_reason_check", sql`${t.reason_code} <> ''`),
    index("alpha_posture_gate_decisions_decision_idx").on(t.decision, t.created_at.desc()),
  ],
);

export type AlphaConsentRecordRow = typeof alphaConsentRecords.$inferSelect;
export type NewAlphaConsentRecordRow = typeof alphaConsentRecords.$inferInsert;
export type AlphaHumanReviewDecisionRow = typeof alphaHumanReviewDecisions.$inferSelect;
export type NewAlphaHumanReviewDecisionRow = typeof alphaHumanReviewDecisions.$inferInsert;
export type AlphaCounselEvidenceReferenceRow = typeof alphaCounselEvidenceReferences.$inferSelect;
export type NewAlphaCounselEvidenceReferenceRow =
  typeof alphaCounselEvidenceReferences.$inferInsert;
export type AlphaPostureGateDecisionRow = typeof alphaPostureGateDecisions.$inferSelect;
export type NewAlphaPostureGateDecisionRow = typeof alphaPostureGateDecisions.$inferInsert;
