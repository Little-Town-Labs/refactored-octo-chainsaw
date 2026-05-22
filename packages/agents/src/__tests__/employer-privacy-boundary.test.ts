import { employerRunInputFixture } from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";

describe("employer privacy boundary", () => {
  test("refuses raw seeker data in counterparty projection", async () => {
    const decision = await runEmployerAdvocateTurn(
      await employerRunInputFixture({
        counterparty_projection: {
          projection_ref: "bad_projection",
          filtered: true,
          payload: { raw_seeker_pii: "blocked" },
        },
      }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("unfiltered_counterparty_data");
  });
});
