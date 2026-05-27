import { runScenario, deriveRunStatus, type ProductScenario } from "../index.js";

const clock = (): (() => Date) => {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 0, tick++));
};

describe("product harness runner", () => {
  it("runs a passing no-op scenario", async () => {
    const result = await runScenario(
      {
        scenario_id: "runner.pass",
        version: "1.0.0",
        title: "Passing runner scenario",
        mode: "gate",
        steps: [
          {
            step_id: "step-1",
            name: "Step one",
            run: () => ({
              assertions: [
                {
                  assertion_id: "a1",
                  name: "Outcome matches",
                  severity: "blocker",
                  status: "passed",
                  expected: "pass",
                  actual: "pass",
                },
              ],
            }),
          },
        ],
      },
      { run_id: "run-pass", environment: { label: "test" }, now: clock() },
    );

    expect(result.status).toBe("passed");
    expect(result.steps).toHaveLength(1);
    expect(result.assertions).toHaveLength(1);
    expect(result.summary).toContain("runner.pass passed");
  });

  it("records thrown step errors as failed steps", async () => {
    const scenario: ProductScenario = {
      scenario_id: "runner.throw",
      version: "1.0.0",
      title: "Throwing runner scenario",
      mode: "gate",
      steps: [
        {
          step_id: "throwing-step",
          name: "Throwing step",
          run: () => {
            throw new Error("token=super-secret-value failed");
          },
        },
      ],
    };

    const result = await runScenario(scenario, {
      run_id: "run-throw",
      environment: { label: "test" },
      now: clock(),
    });

    expect(result.status).toBe("failed");
    expect(result.steps[0]).toMatchObject({
      status: "failed",
      error: "token=[redacted] failed",
    });
  });

  it("fails the run when a blocker assertion fails", () => {
    expect(
      deriveRunStatus([{ status: "passed" }], [{ status: "failed", severity: "blocker" }]),
    ).toBe("failed");
  });
});
