import { employerRunInputFixture } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer turn contract", () => {
  test("returns accepted employer turn with contract-shaped payload", async () => {
    const decision = await runEmployerAdvocateTurn(await employerRunInputFixture());

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.side).toBe("employer");
    expect(decision.result.message_to_counterparty).toContain("Employer perspective:");
    expect(decision.result.frozen_refs.prompt_ref.prompt_id).toBe("employer-advocate");
  });
});
