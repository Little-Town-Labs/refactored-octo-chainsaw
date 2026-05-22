import { employerRunInputFixture } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer turn invocation", () => {
  test("returns invocation and audit evidence from governed F12 path", async () => {
    const decision = await runEmployerAdvocateTurn(await employerRunInputFixture());

    expect(decision.ok).toBe(true);
    if (!decision.ok) throw new Error(decision.refusal.reason_code);
    expect(decision.result.invocation_ref).toBeDefined();
    expect(decision.result.audit_refs.length).toBeGreaterThan(0);
  });
});
