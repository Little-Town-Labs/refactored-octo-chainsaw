import { employerRunInputFixture, seededEmployerRuntime } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer turn frozen refs", () => {
  test("keeps dispatch-time refs when newer versions exist", async () => {
    const runtime = await seededEmployerRuntime();
    const input = await employerRunInputFixture({ runtime });

    const decision = await runEmployerAdvocateTurn(input);

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.frozen_refs.prompt_ref.version).toBe("1.0.0");
    expect(decision.result.frozen_refs.manifest_ref.version).toBe("1.0.0");
  });
});
