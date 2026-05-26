import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyMonitoringSignal } from "../classifier.js";
import { monitoringSignalSchema } from "../schemas.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe("monitoring signal JSON schema contract", () => {
  it("keeps the YAML contract aligned with generated monitoring signals", () => {
    const schemaPath = path.resolve(testDir, "../../contracts/monitoring-signal.v1.schema.yaml");
    const schema = fs.readFileSync(schemaPath, "utf8");
    const signal = classifyMonitoringSignal({
      id: "sig_1",
      source: "privacy_filter",
      category: "cross_side_leakage",
      observed_at: "2026-05-26T12:00:00.000Z",
      evidence_ref: { kind: "audit_event", ref: "audit_1" },
    });

    expect(schema).toContain("incident.monitoring_signal.v1");
    expect(schema).toContain("cross_side_leakage");
    expect(schema).toContain("audit_chain_integrity_failure");
    expect(monitoringSignalSchema.parse(signal)).toEqual(signal);
  });
});
