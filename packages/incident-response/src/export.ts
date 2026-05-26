import type {
  CorrectiveAction,
  EvidenceRef,
  Incident,
  IncidentTimelineEntry,
  NotificationObligation,
} from "./types.js";

export type IncidentEvidencePacket = {
  incident: Pick<
    Incident,
    | "id"
    | "incident_key"
    | "title"
    | "severity"
    | "status"
    | "awareness_at"
    | "affected_systems"
    | "affected_data_classes"
    | "personal_data_involved"
    | "high_risk_to_data_subjects"
  >;
  timeline: IncidentTimelineEntry[];
  evidence_refs: EvidenceRef[];
  notification_obligations: NotificationObligation[];
  corrective_actions: CorrectiveAction[];
};

export function exportIncidentEvidencePacket(input: {
  incident: Incident;
  timeline: IncidentTimelineEntry[];
  evidence_refs: EvidenceRef[];
  notification_obligations: NotificationObligation[];
  corrective_actions: CorrectiveAction[];
}): IncidentEvidencePacket {
  return {
    incident: {
      id: input.incident.id,
      incident_key: input.incident.incident_key,
      title: input.incident.title,
      severity: input.incident.severity,
      status: input.incident.status,
      affected_systems: input.incident.affected_systems,
      affected_data_classes: input.incident.affected_data_classes,
      personal_data_involved: input.incident.personal_data_involved,
      high_risk_to_data_subjects: input.incident.high_risk_to_data_subjects,
      ...(input.incident.awareness_at ? { awareness_at: input.incident.awareness_at } : {}),
    },
    timeline: input.timeline,
    evidence_refs: input.evidence_refs.map((ref) => ({
      kind: ref.kind,
      ref: ref.ref,
      ...(ref.hash ? { hash: ref.hash } : {}),
      contains_personal_data: ref.contains_personal_data ?? false,
    })),
    notification_obligations: input.notification_obligations,
    corrective_actions: input.corrective_actions,
  };
}
