import fs from "node:fs";

describe("incident response runbook docs", () => {
  it("cover sev-1, sev-2, sev-3, and required tabletop scenarios", () => {
    const runbook = fs.readFileSync("../../docs/runbooks/incident-response.md", "utf8");
    const tabletop = fs.readFileSync("../../docs/runbooks/incident-response-tabletop.md", "utf8");

    for (const marker of ["sev-1", "sev-2", "sev-3"]) {
      expect(runbook).toContain(marker);
    }
    for (const marker of [
      "cross-side leakage",
      "credential compromise",
      "monitoring/deadline failure",
    ]) {
      expect(tabletop).toContain(marker);
    }
  });
});
