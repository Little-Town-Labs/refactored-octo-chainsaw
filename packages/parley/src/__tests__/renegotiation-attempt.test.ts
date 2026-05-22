import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation attempts", () => {
  it("keeps the same match ticket and records the requested attempt sequence", async () => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest({ requested_attempt: 2 }),
      matchTicket: renegotiationMatchTicket({ current_attempt: 1 }),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result.match_ticket_id).toBe(renegotiationMatchTicket().match_ticket_id);
    expect(result.attempt).toBe(2);
    expect(result.attempt_record?.attempt_id).toBe(`${result.match_ticket_id}:2`);
  });
});
