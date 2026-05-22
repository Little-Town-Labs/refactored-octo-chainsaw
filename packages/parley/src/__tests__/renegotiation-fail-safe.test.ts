import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation fail-safe behavior", () => {
  it("refuses non-asymmetric prior outcomes before allocation", async () => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket({ prior_outcome: "inconclusive" }),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "prior_outcome_not_asymmetric" });
    expect(result.run_id).toBeNull();
  });

  it("refuses malformed event semantics before allocation", async () => {
    const result = await processRenegotiationRequest({
      request: { ...renegotiationRequest(), event_name: "match_ticket.match_made" as never },
      matchTicket: renegotiationMatchTicket(),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "missing_required_reference" });
  });
});
