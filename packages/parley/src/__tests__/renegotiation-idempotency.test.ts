import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation idempotency", () => {
  it("replays duplicate request events without allocating a second run", async () => {
    const repository = new InMemoryRenegotiationRepository();
    const runRepository = new InMemoryParleyRunRepository();
    const request = renegotiationRequest();
    const first = await processRenegotiationRequest({
      request,
      matchTicket: renegotiationMatchTicket(),
      repository,
      runRepository,
      estimatedCost: 4,
    });
    const second = await processRenegotiationRequest({
      request,
      matchTicket: renegotiationMatchTicket(),
      repository,
      runRepository,
      estimatedCost: 4,
    });

    expect(second).toMatchObject({
      decision: "idempotent_replay",
      reason_code: "duplicate_request",
    });
    expect(second.run_id).toBe(first.run_id);
    await expect(runRepository.listRuns()).resolves.toHaveLength(1);
  });

  it("refuses a distinct request when an active run already exists", async () => {
    const repository = new InMemoryRenegotiationRepository();
    const runRepository = new InMemoryParleyRunRepository();
    await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket(),
      repository,
      runRepository,
      estimatedCost: 4,
    });

    const result = await processRenegotiationRequest({
      request: renegotiationRequest({ request_id: "00000000-0000-7000-8000-000000001599" }),
      matchTicket: renegotiationMatchTicket({ current_attempt: 1 }),
      repository,
      runRepository,
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: "active_run_exists" });
  });
});
