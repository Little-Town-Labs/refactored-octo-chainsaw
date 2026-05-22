import {
  InMemoryRenegotiationRepository,
  observeRenegotiationCost,
  processRenegotiationRequest,
} from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation runtime cost", () => {
  it("terminates active attempts that cross the cost ceiling", async () => {
    const repository = new InMemoryRenegotiationRepository();
    const accepted = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket({ cost_ceiling: 5 }),
      repository,
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    const result = await observeRenegotiationCost({
      attempt: accepted.attempt_record!,
      repository,
      observedCost: 6,
    });

    expect(result.attempt).toMatchObject({
      status: "terminated",
      terminal_reason: "cost_ceiling_exceeded",
    });
    expect(result.alarm).toMatchObject({
      severity: "critical",
      alarm_type: "cost_ceiling_exceeded",
    });
  });
});
