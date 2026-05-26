import { classifyMonitoringSignal } from "../classifier.js";

const observed_at = "2026-05-26T12:00:00.000Z";

describe("monitoring signal classifier", () => {
  it("hard-classifies cross-side leakage and audit-chain failures as sev1", () => {
    const leakage = classifyMonitoringSignal({
      id: "sig_1",
      source: "privacy_filter",
      category: "cross_side_leakage",
      requested_severity: "sev3",
      observed_at,
      affected_subject: { kind: "match", id: "match_1" },
      evidence_ref: { kind: "audit_event", ref: "audit_1" },
    });
    const chainFailure = classifyMonitoringSignal({
      id: "sig_2",
      source: "audit_log",
      category: "audit_chain_integrity_failure",
      requested_severity: "sev2",
      observed_at,
      affected_subject: { kind: "audit_chain", id: "chain_main" },
      evidence_ref: { kind: "hash_chain_verification", ref: "verify_1" },
    });

    expect(leakage.severity).toBe("sev1");
    expect(leakage.escalation_hint).toBe("page_on_call");
    expect(chainFailure.severity).toBe("sev1");
  });

  it("classifies auth, credential, webhook, API, and sink anomalies with dedupe keys", () => {
    const cases = [
      ["auth", "auth_anomaly", "sev3"],
      ["credential_lifecycle", "credential_misuse", "sev2"],
      ["webhook_delivery", "webhook_replay_or_signature_abuse", "sev2"],
      ["employer_api", "employer_api_abuse", "sev3"],
      ["manual_report", "monitoring_sink_failure", "sev2"],
    ] as const;

    for (const [source, category, severity] of cases) {
      const signal = classifyMonitoringSignal({
        id: `sig_${category}`,
        source,
        category,
        observed_at,
        affected_subject: { kind: "principal", id: "principal_1" },
        evidence_ref: { kind: "external_issue", ref: `evidence_${category}` },
      });
      expect(signal.severity).toBe(severity);
      expect(signal.dedupe_key).toContain(category);
      expect(signal.evidence_ref.ref).toContain("evidence_");
    }
  });
});
