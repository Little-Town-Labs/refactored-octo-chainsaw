import {
  InMemoryRenegotiationRepository,
  processRenegotiationRequest,
  projectRenegotiationOutcome,
} from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation outcome projection", () => {
  it("exposes later-surface state without hidden run internals", async () => {
    const decision = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket(),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(projectRenegotiationOutcome(decision)).toMatchObject({
      decision: "allow",
      hidden_run_state_exposed: false,
      non_cleared_side_notified: false,
    });
  });
});
