import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation accepted contract", () => {
  it("accepts an explicit re-negotiation event and allocates a fresh run", async () => {
    const repository = new InMemoryRenegotiationRepository();
    const runRepository = new InMemoryParleyRunRepository();
    const result = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket(),
      repository,
      runRepository,
      estimatedCost: 4,
    });

    expect(result).toMatchObject({
      decision: "allow",
      reason_code: "renegotiation_allowed",
      match_ticket_id: "00000000-0000-7000-8000-000000001502",
      attempt: 2,
      run_id: "00000000-0000-7000-8000-000000001501",
    });
    expect(result.run_id).not.toBe(renegotiationRequest().prior_run_id);
    await expect(runRepository.getRun(result.run_id ?? "")).resolves.toMatchObject({
      run_id: result.run_id,
      attempt: 2,
      status: "pending",
    });
  });
});
