import {
  InMemoryRenegotiationRepository,
  freshIsolationBoundary,
  processRenegotiationRequest,
} from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation isolation", () => {
  it("starts with no inherited prompt, tool, scratch, or prior context state", async () => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket(),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result.attempt_record?.isolation_boundary).toEqual(freshIsolationBoundary());
    expect(result.attempt_record?.prior_run_id).toBe(renegotiationRequest().prior_run_id);
    expect(result.attempt_record?.prior_dossier_id).toBe("dossier-01500");
  });
});
