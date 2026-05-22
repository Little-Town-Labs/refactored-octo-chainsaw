import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation audit", () => {
  it("records audit evidence for accepted request and run allocation", async () => {
    const repository = new InMemoryRenegotiationRepository();
    await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket(),
      repository,
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    await expect(repository.listAuditEvents()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event_name: "renegotiation.request.accepted" }),
        expect.objectContaining({ event_name: "renegotiation.run.allocated" }),
      ]),
    );
  });
});
