import { z } from "zod";

import { ALPHA_BANNER, ALPHA_PHASE } from "./types.js";

export const alphaConsentRecordSchema = z.object({
  consent_id: z.string().min(1),
  participant_role: z.enum(["seeker", "employer"]),
  principal_id: z.string().min(1),
  org_id: z.string().min(1).optional(),
  consent_version: z.string().min(1),
  state: z.enum(["consented", "declined", "withdrawn", "expired"]),
  evidence_ref: z.string().min(1),
  recorded_at: z.string().datetime(),
  withdrawn_at: z.string().datetime().optional(),
});

export const alphaDossierPostureSchema = z.object({
  phase: z.literal(ALPHA_PHASE),
  banner: z.literal(ALPHA_BANNER),
  posture_version: z.string().min(1),
  non_production_decision: z.literal(true),
  applied_at: z.string().datetime(),
});

export const alphaHumanReviewRecordSchema = z.object({
  review_id: z.string().min(1),
  match_id: z.string().min(1),
  dossier_id: z.string().min(1),
  reviewer_principal_id: z.string().min(1),
  decision: z.enum(["approved", "rejected", "needs_changes"]),
  reason: z.string().min(1),
  evidence_ref: z.string().min(1),
  reviewed_at: z.string().datetime(),
});

export const counselEvidenceReferenceSchema = z.object({
  evidence_id: z.string().min(1),
  phase: z.enum(["phase_0", "phase_1"]),
  transition: z.enum(["phase_0_to_phase_1", "phase_0_entry"]),
  memo_path: z.string().startsWith(".specify/memory/counsel-reviews/"),
  reviewer: z.string().min(1),
  signed: z.literal(true),
  dated_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evidence_hash: z.string().optional(),
});
