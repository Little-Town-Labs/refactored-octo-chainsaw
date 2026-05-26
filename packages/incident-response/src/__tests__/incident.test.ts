import { classifyMonitoringSignal } from "../classifier.js";
import {
  appendTimelineEntry,
  assignCommander,
  openIncident,
  transitionIncident,
} from "../incident.js";

const now = "2026-05-26T12:00:00.000Z";

describe("incident lifecycle", () => {
  it("opens and assigns a sev1 incident from a monitoring signal", () => {
    const signal = classifyMonitoringSignal({
      id: "sig_leak",
      source: "privacy_filter",
      category: "cross_side_leakage",
      observed_at: now,
      evidence_ref: { kind: "audit_event", ref: "audit_1" },
    });

    const incident = assignCommander(
      openIncident({
        id: "inc_1",
        incident_key: "INC-2026-0001",
        title: "Cross-side leakage",
        signal,
        created_at: now,
        created_by_principal_id: "principal_1",
      }),
      "principal_commander",
    );

    expect(incident.severity).toBe("sev1");
    expect(incident.status).toBe("triage");
    expect(incident.commander_principal_id).toBe("principal_commander");
  });

  it("rejects invalid transitions and sev1 closure without required review material", () => {
    const incident = openIncident({
      id: "inc_1",
      incident_key: "INC-2026-0001",
      title: "Cross-side leakage",
      severity: "sev1",
      created_at: now,
      created_by_principal_id: "principal_1",
    });

    expect(() => transitionIncident(incident, "recovering")).toThrow(/Invalid/);
    expect(() => transitionIncident(incident, "closed")).toThrow(/notification assessment/);

    const reviewReady = {
      ...incident,
      notification_assessment_completed: true,
      postmortem_summary: "Root cause documented",
      corrective_action_tracking: "none_required" as const,
    };
    expect(transitionIncident(reviewReady, "closed").status).toBe("closed");
  });

  it("appends principal-attributed timeline entries", () => {
    const entry = appendTimelineEntry(
      { id: "inc_1" },
      {
        id: "entry_1",
        entry_type: "triage",
        body: "Commander assigned",
        principal_id: "principal_1",
        occurred_at: now,
      },
    );

    expect(entry.incident_id).toBe("inc_1");
    expect(entry.principal_id).toBe("principal_1");
  });
});
