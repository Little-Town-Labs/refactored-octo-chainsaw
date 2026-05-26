import { z } from "zod";

import {
  AFFECTED_SUBJECT_KINDS,
  ESCALATION_HINTS,
  EVIDENCE_KINDS,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  MONITORING_SIGNAL_CATEGORIES,
  MONITORING_SIGNAL_SOURCES,
} from "./types.js";

export const evidenceRefSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  ref: z.string().min(1),
  hash: z.string().optional(),
  contains_personal_data: z.boolean().optional(),
});

export const affectedSubjectSchema = z.object({
  kind: z.enum(AFFECTED_SUBJECT_KINDS),
  id: z.string().min(1),
});

export const monitoringSignalSchema = z
  .object({
    schema_version: z.literal("incident.monitoring_signal.v1"),
    id: z.string().min(1),
    source: z.enum(MONITORING_SIGNAL_SOURCES),
    category: z.enum(MONITORING_SIGNAL_CATEGORIES),
    severity: z.enum(INCIDENT_SEVERITIES),
    dedupe_key: z.string().min(8),
    observed_at: z.string().datetime(),
    affected_subject: affectedSubjectSchema.optional(),
    evidence_ref: evidenceRefSchema,
    escalation_hint: z.enum(ESCALATION_HINTS),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.category === "cross_side_leakage" ||
        value.category === "audit_chain_integrity_failure") &&
      value.severity !== "sev1"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["severity"],
        message: "cross-side leakage and audit-chain failures must be sev1",
      });
    }
  });

export const incidentSchema = z.object({
  id: z.string().min(1),
  incident_key: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(INCIDENT_SEVERITIES),
  status: z.enum(INCIDENT_STATUSES),
  commander_principal_id: z.string().min(1).optional(),
  source_signal_id: z.string().min(1).optional(),
  awareness_at: z.string().datetime().optional(),
  detected_at: z.string().datetime(),
  affected_systems: z.array(z.string().min(1)),
  affected_data_classes: z.array(z.string().min(1)),
  personal_data_involved: z.boolean(),
  high_risk_to_data_subjects: z.boolean(),
  notification_assessment_completed: z.boolean(),
  postmortem_summary: z.string().min(1).optional(),
  corrective_action_tracking: z.enum(["pending", "created", "none_required"]),
});

export const notificationObligationSchema = z.object({
  id: z.string().min(1),
  incident_id: z.string().min(1),
  obligation_type: z.enum([
    "gdpr_supervisory_authority",
    "gdpr_data_subject_high_risk_review",
    "us_state_counsel_review",
    "contractual_employer_notice",
  ]),
  jurisdiction: z.string().min(1),
  recipient: z.string().min(1),
  deadline_at: z.string().datetime().optional(),
  status: z.enum(["pending", "counsel_review", "not_required", "sent", "blocked", "overdue"]),
  decision: z.enum(["notify", "do_not_notify", "pending_counsel"]).optional(),
  decision_rationale: z.string().optional(),
});
