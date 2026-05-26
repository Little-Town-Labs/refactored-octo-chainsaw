import type {
  CorrectiveAction,
  Incident,
  IncidentStatus,
  IncidentTimelineEntry,
  MonitoringSignal,
} from "./types.js";

export type OpenIncidentInput = {
  id: string;
  incident_key: string;
  title: string;
  signal?: MonitoringSignal;
  severity?: Incident["severity"];
  commander_principal_id?: string;
  created_at: string;
  created_by_principal_id: string;
  personal_data_involved?: boolean;
  affected_systems?: string[];
  affected_data_classes?: string[];
};

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  triage: ["investigating", "closed"],
  investigating: ["contained", "review"],
  contained: ["recovering", "review"],
  recovering: ["review"],
  review: ["closed"],
  closed: [],
};

export function openIncident(input: OpenIncidentInput): Incident {
  return {
    id: input.id,
    incident_key: input.incident_key,
    title: input.title,
    severity: input.severity ?? input.signal?.severity ?? "sev3",
    status: "triage",
    ...(input.commander_principal_id
      ? { commander_principal_id: input.commander_principal_id }
      : {}),
    ...(input.signal ? { source_signal_id: input.signal.id } : {}),
    detected_at: input.signal?.observed_at ?? input.created_at,
    affected_systems: input.affected_systems ?? [],
    affected_data_classes: input.affected_data_classes ?? [],
    personal_data_involved: input.personal_data_involved ?? false,
    high_risk_to_data_subjects: false,
    notification_assessment_completed: false,
    corrective_action_tracking: "pending",
  };
}

export function assignCommander(incident: Incident, commanderPrincipalId: string): Incident {
  return { ...incident, commander_principal_id: commanderPrincipalId };
}

export function transitionIncident(
  incident: Incident,
  nextStatus: IncidentStatus,
  correctiveActions: CorrectiveAction[] = [],
): Incident {
  if (!ALLOWED_TRANSITIONS[incident.status].includes(nextStatus)) {
    throw new Error(`Invalid incident transition: ${incident.status} -> ${nextStatus}`);
  }
  if (nextStatus === "closed") {
    assertCanCloseIncident(incident, correctiveActions);
  }
  return { ...incident, status: nextStatus };
}

export function appendTimelineEntry(
  incident: Pick<Incident, "id">,
  entry: Omit<IncidentTimelineEntry, "incident_id">,
): IncidentTimelineEntry {
  if (!entry.principal_id) {
    throw new Error("Incident timeline entries require principal attribution");
  }
  return { ...entry, incident_id: incident.id };
}

export function assertCanCloseIncident(
  incident: Incident,
  correctiveActions: CorrectiveAction[] = [],
): void {
  if (incident.severity !== "sev1") return;
  if (!incident.notification_assessment_completed) {
    throw new Error("Sev-1 incidents require notification assessment before closure");
  }
  if (!incident.postmortem_summary) {
    throw new Error("Sev-1 incidents require a postmortem summary before closure");
  }
  if (
    incident.corrective_action_tracking === "pending" ||
    (incident.corrective_action_tracking === "created" && correctiveActions.length === 0)
  ) {
    throw new Error("Sev-1 incidents require corrective-action tracking before closure");
  }
}
