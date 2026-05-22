import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation requester refusal", () => {
  it("refuses unauthorized principals", async () => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest({ requester_scopes: [] }),
      matchTicket: renegotiationMatchTicket(),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "unauthorized_requester" });
    expect(result.run_id).toBeNull();
  });

  it("refuses the non-cleared side", async () => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest({ requester_side: "employer" }),
      matchTicket: renegotiationMatchTicket({ prior_outcome: "seeker_cleared" }),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "requester_not_cleared_side" });
  });
});
