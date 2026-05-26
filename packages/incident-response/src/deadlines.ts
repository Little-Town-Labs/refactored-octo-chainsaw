import { classifyMonitoringSignal } from "./classifier.js";
import type { Incident, MonitoringSignal, NotificationObligation } from "./types.js";

const HOUR_MS = 60 * 60 * 1000;

export type BuildNotificationObligationsInput = {
  incident: Incident;
  jurisdictions: string[];
  employer_counterparties?: string[];
};

export function buildNotificationObligations(
  input: BuildNotificationObligationsInput,
): NotificationObligation[] {
  if (!input.incident.personal_data_involved) return [];
  if (!input.incident.awareness_at) {
    throw new Error("Awareness time is required for breach-notification obligations");
  }

  const obligations: NotificationObligation[] = [];
  const gdprJurisdictions = input.jurisdictions.filter((j) => j === "EU" || j.startsWith("EU-"));
  const usJurisdictions = input.jurisdictions.filter((j) => j.startsWith("US-"));

  for (const jurisdiction of gdprJurisdictions) {
    obligations.push({
      id: `${input.incident.id}:gdpr-authority:${jurisdiction}`,
      incident_id: input.incident.id,
      obligation_type: "gdpr_supervisory_authority",
      jurisdiction,
      recipient: "supervisory_authority",
      deadline_at: addHours(input.incident.awareness_at, 72),
      status: "counsel_review",
      decision: "pending_counsel",
    });
    obligations.push({
      id: `${input.incident.id}:gdpr-subject:${jurisdiction}`,
      incident_id: input.incident.id,
      obligation_type: "gdpr_data_subject_high_risk_review",
      jurisdiction,
      recipient: "data_subjects",
      status: "counsel_review",
      decision: "pending_counsel",
    });
  }

  for (const jurisdiction of usJurisdictions) {
    obligations.push({
      id: `${input.incident.id}:us-state:${jurisdiction}`,
      incident_id: input.incident.id,
      obligation_type: "us_state_counsel_review",
      jurisdiction,
      recipient: "state_or_counsel_review",
      status: "counsel_review",
      decision: "pending_counsel",
    });
  }

  for (const counterparty of input.employer_counterparties ?? []) {
    obligations.push({
      id: `${input.incident.id}:contractual:${counterparty}`,
      incident_id: input.incident.id,
      obligation_type: "contractual_employer_notice",
      jurisdiction: "contractual",
      recipient: counterparty,
      status: "counsel_review",
      decision: "pending_counsel",
    });
  }

  return obligations;
}

export function deadlineRiskSignals(
  incident: Incident,
  obligations: NotificationObligation[],
  now = new Date(),
): MonitoringSignal[] {
  return obligations.flatMap((obligation) => {
    if (
      !obligation.deadline_at ||
      obligation.status === "sent" ||
      obligation.status === "not_required"
    ) {
      return [];
    }
    const deadline = new Date(obligation.deadline_at).getTime();
    const remaining = deadline - now.getTime();
    if (remaining > 6 * HOUR_MS) return [];
    const risk = remaining < 0 ? "overdue" : "approaching";
    return [
      classifyMonitoringSignal({
        id: `sig_${obligation.id}:${risk}`,
        source: "notification_deadline",
        category: "notification_deadline_risk",
        requested_severity: remaining < 0 ? "sev1" : "sev2",
        observed_at: now.toISOString(),
        affected_subject: { kind: "incident", id: incident.id },
        evidence_ref: {
          kind: "external_issue",
          ref: obligation.id,
          contains_personal_data: false,
        },
        metadata: { risk, deadline_at: obligation.deadline_at },
      }),
    ];
  });
}

export function addHours(isoDate: string, hours: number): string {
  return new Date(new Date(isoDate).getTime() + hours * HOUR_MS).toISOString();
}
