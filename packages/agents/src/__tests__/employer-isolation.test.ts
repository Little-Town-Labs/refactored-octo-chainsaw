import { employerRunInputFixture } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer run isolation", () => {
  test("refuses context from a prior run", async () => {
    const base = await employerRunInputFixture();
    const decision = await runEmployerAdvocateTurn(
      await employerRunInputFixture({ context: { ...base.context, run_id: "prior_run" } }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("prior_run_context_refused");
  });
});
