import { preserveEvidenceReference } from "../evidence.js";

describe("evidence references", () => {
  it("preserves minimal references without copying raw payloads", () => {
    const evidence = preserveEvidenceReference(
      {
        incident_id: "inc_1",
        kind: "audit_event",
        ref: "audit_123",
        hash: "sha256:abc",
        contains_personal_data: false,
        created_by_principal_id: "principal_1",
      },
      new Date("2026-05-26T12:00:00.000Z"),
    );

    expect(evidence.id).toBe("ev_audit_event_audit_123");
    expect(evidence.hash).toBe("sha256:abc");
  });

  it("rejects likely raw payloads", () => {
    expect(() =>
      preserveEvidenceReference({
        incident_id: "inc_1",
        kind: "audit_event",
        ref: "line one\nline two",
        created_by_principal_id: "principal_1",
      }),
    ).toThrow(/raw payloads/);
  });
});
