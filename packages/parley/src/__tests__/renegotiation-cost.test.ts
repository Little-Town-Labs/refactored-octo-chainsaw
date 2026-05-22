import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation preflight cost", () => {
  it("refuses over-ceiling requests and emits an alarm", async () => {
    const repository = new InMemoryRenegotiationRepository();
    const result = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket({ cost_ceiling: 3 }),
      repository,
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "cost_ceiling_exceeded" });
    expect(result.alarms).toEqual(
      expect.arrayContaining([expect.objectContaining({ alarm_type: "cost_ceiling_exceeded" })]),
    );
  });
});
