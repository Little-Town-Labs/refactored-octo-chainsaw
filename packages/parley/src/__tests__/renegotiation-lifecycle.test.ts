import { InMemoryRenegotiationRepository, processRenegotiationRequest } from "../renegotiation.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "./fixtures.js";

describe("F15 re-negotiation lifecycle refusals", () => {
  it.each([
    ["closed", { status: "closed" as const }, "match_ticket_not_eligible"],
    ["withdrawn", { status: "withdrawn" as const }, "match_ticket_not_eligible"],
    ["legal hold", { legal_hold: true }, "legal_hold_blocks_processing"],
    ["tombstone", { tombstoned: true }, "tombstone_blocks_processing"],
    ["missing prior", { prior_run_ids: [] }, "missing_required_reference"],
  ])("refuses %s tickets", async (_label, override, reason) => {
    const result = await processRenegotiationRequest({
      request: renegotiationRequest(),
      matchTicket: renegotiationMatchTicket(override),
      repository: new InMemoryRenegotiationRepository(),
      runRepository: new InMemoryParleyRunRepository(),
      estimatedCost: 4,
    });

    expect(result).toMatchObject({ decision: "deny", reason_code: reason });
  });
});
