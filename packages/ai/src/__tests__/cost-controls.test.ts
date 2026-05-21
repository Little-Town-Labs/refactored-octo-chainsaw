import { evaluatePreflightCost } from "../cost-controls.js";
import { manifestFixture, modelFixture } from "./fixtures.js";

describe("cost controls", () => {
  test("refuses preflight when estimated spend exceeds ceiling", () => {
    const result = evaluatePreflightCost({
      manifest: manifestFixture({
        cost_controls: [{ scope: "run", ceiling: 0, unit: "usd", on_preflight_exceeded: "refuse" }],
      }),
      model: modelFixture(),
      estimatedUnits: 100,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision).toBe("refused");
  });
});
