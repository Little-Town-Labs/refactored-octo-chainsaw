import { buildNotificationObligations, deadlineRiskSignals } from "../deadlines.js";
import type { Incident } from "../types.js";

const incident: Incident = {
  id: "inc_1",
  incident_key: "INC-2026-0001",
  title: "Personal data incident",
  severity: "sev1",
  status: "triage",
  awareness_at: "2026-05-26T12:00:00.000Z",
  detected_at: "2026-05-26T12:00:00.000Z",
  affected_systems: ["privacy_filter"],
  affected_data_classes: ["seeker_profile"],
  personal_data_involved: true,
  high_risk_to_data_subjects: true,
  notification_assessment_completed: false,
  corrective_action_tracking: "pending",
};

describe("breach notification deadlines", () => {
  it("computes GDPR 72-hour, data-subject, US-state, and contractual obligations", () => {
    const obligations = buildNotificationObligations({
      incident,
      jurisdictions: ["EU", "US-CA"],
      employer_counterparties: ["org_1"],
    });

    expect(obligations.map((o) => o.obligation_type)).toEqual([
      "gdpr_supervisory_authority",
      "gdpr_data_subject_high_risk_review",
      "us_state_counsel_review",
      "contractual_employer_notice",
    ]);
    expect(obligations[0]?.deadline_at).toBe("2026-05-29T12:00:00.000Z");
  });

  it("emits approaching and overdue deadline risk signals", () => {
    const obligations = buildNotificationObligations({
      incident,
      jurisdictions: ["EU"],
    });
    const approaching = deadlineRiskSignals(
      incident,
      obligations,
      new Date("2026-05-29T08:00:00.000Z"),
    );
    const overdue = deadlineRiskSignals(
      incident,
      obligations,
      new Date("2026-05-29T13:00:00.000Z"),
    );

    expect(approaching).toHaveLength(1);
    expect(approaching[0]?.severity).toBe("sev2");
    expect(overdue[0]?.severity).toBe("sev1");
  });
});
