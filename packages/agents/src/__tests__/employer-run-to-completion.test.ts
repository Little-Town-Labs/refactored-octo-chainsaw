import { employerRunInputFixture } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer run-to-completion", () => {
  test("refuses human-input pause tools", async () => {
    const decision = await runEmployerAdvocateTurn(
      await employerRunInputFixture({ allowed_tool_names: ["ask_principal_for_confirmation"] }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("human_input_pause_refused");
  });
});
