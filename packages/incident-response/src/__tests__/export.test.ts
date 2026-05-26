import { exportIncidentEvidencePacket } from "../export.js";
import type { Incident } from "../types.js";

describe("incident evidence packet export", () => {
  it("exports summary, timeline, evidence refs, obligations, and corrective actions", () => {
    const incident: Incident = {
      id: "inc_1",
      incident_key: "INC-2026-0001",
      title: "Cross-side leakage",
      severity: "sev1",
      status: "review",
      awareness_at: "2026-05-26T12:00:00.000Z",
      detected_at: "2026-05-26T12:00:00.000Z",
      affected_systems: ["privacy_filter"],
      affected_data_classes: ["seeker_profile"],
      personal_data_involved: true,
      high_risk_to_data_subjects: true,
      notification_assessment_completed: true,
      corrective_action_tracking: "created",
    };

    const packet = exportIncidentEvidencePacket({
      incident,
      timeline: [
        {
          id: "entry_1",
          incident_id: "inc_1",
          entry_type: "triage",
          body: "Opened",
          principal_id: "principal_1",
          occurred_at: "2026-05-26T12:01:00.000Z",
        },
      ],
      evidence_refs: [{ kind: "audit_event", ref: "audit_1", contains_personal_data: true }],
      notification_obligations: [],
      corrective_actions: [],
    });

    expect(packet.incident.title).toBe("Cross-side leakage");
    expect(packet.evidence_refs[0]).toEqual({
      kind: "audit_event",
      ref: "audit_1",
      contains_personal_data: true,
    });
  });
});
