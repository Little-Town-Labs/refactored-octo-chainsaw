import {
  InMemoryRenegotiationRepository,
  effectiveRenegotiationRoundCap,
  processRenegotiationRequest,
} from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation round caps", () => {
  it("uses the strictest seeker, employer, and platform cap", () => {
    expect(
      effectiveRenegotiationRoundCap(
        renegotiationMatchTicket({ seeker_round_cap: 5, employer_round_cap: 2 }),
        { default_round_cap: 3 },
      ),
    ).toBe(2);
  });

  it("refuses attempts beyond the effective cap with audit and alarm evidence", async () => {
    const repository = new InMemoryRenegotiationRepository();
    const result = await processRenegotiationRequest({
      request: renegotiationRequest({ requested_attempt: 3 }),
      matchTicket: renegotiationMatchTicket({ current_attempt: 2, employer_round_cap: 2 }),
      repository,
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "round_cap_exhausted" });
    await expect(repository.listAlarms()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ alarm_type: "round_cap_exhausted" })]),
    );
  });
});
