import { runInputFixture } from "../fixtures.js";
import { runSeekerAdvocateTurn } from "../seeker-advocate.js";

describe("seeker advocate turn", () => {
  test("returns accepted turn with frozen refs and invocation evidence", async () => {
    const input = await runInputFixture();

    const decision = await runSeekerAdvocateTurn(input);

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.side).toBe("seeker");
    expect(decision.result.frozen_refs.prompt_ref.version).toBe("1.0.0");
    expect(decision.result.invocation_ref).toBeDefined();
    expect(decision.result.audit_refs.length).toBeGreaterThan(0);
  });

  test("refuses missing frozen refs before invocation", async () => {
    const input = await runInputFixture({
      refs: {
        ...(await runInputFixture()).refs,
        prompt_ref: { prompt_id: "", version: "1.0.0" },
      },
    });

    const decision = await runSeekerAdvocateTurn(input);

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("missing_required_ref");
  });

  test("refuses unfiltered employer-confidential fields", async () => {
    const input = await runInputFixture({
      counterparty_projection: {
        projection_ref: "bad_projection",
        filtered: true,
        payload: { raw_employer_confidential: "do not reveal" },
      },
    });

    const decision = await runSeekerAdvocateTurn(input);

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("unfiltered_counterparty_data");
  });

  test("refuses context from a prior run", async () => {
    const base = await runInputFixture();
    const input = await runInputFixture({
      context: { ...base.context, run_id: "prior_run" },
    });

    const decision = await runSeekerAdvocateTurn(input);

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("prior_run_context_refused");
  });
});
