import {
  REQUIRED_TABLETOP_SCENARIOS,
  TABLETOP_DEFINITIONS,
  validateTabletopCoverage,
} from "../tabletop.js";

describe("tabletop scenarios", () => {
  it("defines all required F24 closure scenarios", () => {
    expect(validateTabletopCoverage(TABLETOP_DEFINITIONS.map((d) => d.scenario))).toEqual([]);
    expect(REQUIRED_TABLETOP_SCENARIOS).toEqual([
      "cross_side_leakage",
      "credential_compromise",
      "monitoring_deadline_failure",
    ]);
  });

  it("detects missing tabletop coverage", () => {
    expect(validateTabletopCoverage(["cross_side_leakage"])).toEqual([
      "credential_compromise",
      "monitoring_deadline_failure",
    ]);
  });
});
