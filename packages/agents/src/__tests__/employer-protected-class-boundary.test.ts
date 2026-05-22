import {
  employerRunInputFixture,
  employerScoringInputFixture,
  employerScoreDraftFixture,
} from "../fixtures.js";
import { runEmployerAdvocateTurn } from "../employer-advocate.js";
import { runEmployerAdvocateScoring } from "../employer-scoring.js";

describe("employer protected-class boundary", () => {
  test("refuses protected-class fields in input projection", async () => {
    const decision = await runEmployerAdvocateTurn(
      await employerRunInputFixture({
        counterparty_projection: {
          projection_ref: "bad_projection",
          filtered: true,
          payload: { protected_class_inference: "blocked" },
        },
      }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("protected_class_boundary_refused");
  });

  test("refuses protected-class scoring draft", async () => {
    const decision = await runEmployerAdvocateScoring(
      await employerScoringInputFixture({
        score_draft: employerScoreDraftFixture({
          protected_class_boundary: "blocked age inference",
        }),
      }),
    );

    expect(decision.ok).toBe(false);
    if (decision.ok) throw new Error("expected refusal");
    expect(decision.refusal.reason_code).toBe("protected_class_boundary_refused");
  });
});
