import { employerRunInputFixture } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer turn refusals", () => {
  test("refuses missing frozen refs before invocation", async () => {
    const base = await employerRunInputFixture();
    const decision = await runEmployerAdvocateTurn(
      await employerRunInputFixture({
        refs: { ...base.refs, prompt_ref: { prompt_id: "", version: "1.0.0" } },
        runtime: base.runtime,
      }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("missing_required_ref");
  });
});
