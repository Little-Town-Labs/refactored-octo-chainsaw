import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation alarms", () => {
  it("records operator-visible alarm evidence", async () => {
    const repository = new InMemoryRenegotiationRepository();
    await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket({ cost_ceiling: 1 }),
      repository,
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 2,
    });

    await expect(repository.listAlarms()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alarm_type: "cost_ceiling_exceeded",
          audit_event_ref: expect.stringContaining("renegotiation.cost.alarm"),
        }),
      ]),
    );
    await expect(repository.listAuditEvents()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ event_name: "renegotiation.cost.alarm" })]),
    );
  });
});
