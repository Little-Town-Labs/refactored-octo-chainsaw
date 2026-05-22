import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation silence posture", () => {
  it("does not notify the non-cleared side on refusal", async () => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest({ requester_side: "employer" }),
      matchTicket: renegotiationMatchTicket(),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result.notification_policy.non_cleared_side_notified).toBe(false);
  });
});
