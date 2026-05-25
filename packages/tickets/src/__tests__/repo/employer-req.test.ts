import { MissingScopeError } from "../../errors.js";
import { createEmployerReqRepo } from "../../repo/employer-req.js";
import { OPERATOR_TRANSITION_SCOPE } from "../../transitions.js";
import { AuditShapeError, assertValidTransitionEvent } from "../audit-shape.helper.js";
import { employerPrincipal, operatorPrincipal } from "./fixtures.js";
import { MemoryTicketStore } from "./memory-store.js";

const draftFields = {
  org_id: employerPrincipal.org_id!,
  role_title: "Senior Engineer",
  role_level: "senior" as const,
  comp_band_min: 120000,
  comp_band_max: 180000,
  currency: "USD",
  jurisdictions: ["US-CA"],
  decision_locus_jurisdiction: "US-CA",
  work_mode: "remote" as const,
  headcount_total: 3,
  threshold: 75,
};

describe("employer-req repo", () => {
  it("insertDraft creates a draft employer requisition", async () => {
    const store = new MemoryTicketStore();
    const repo = createEmployerReqRepo({
      store,
      allocateIdentifier: async () => "ER-2026-00001",
    });

    const row = await repo.insertDraft(employerPrincipal, draftFields);

    expect(row.state).toBe("draft");
    expect(row.identifier).toBe("ER-2026-00001");
    expect(row.org_id).toBe(employerPrincipal.org_id);
    expect(row.headcount_filled).toBe(0);
  });

  it("transition emits a schema-valid audit event", async () => {
    const store = new MemoryTicketStore();
    const repo = createEmployerReqRepo({
      store,
      allocateIdentifier: async () => "ER-2026-00001",
    });
    const draft = await repo.insertDraft(employerPrincipal, draftFields);

    const submitted = await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "submitted",
      principal: employerPrincipal,
    });

    expect(submitted.state).toBe("submitted");
    const [event] = store.audits;
    expect(event.event_name).toBe("employer_req_ticket.submitted");
    expect(() =>
      assertValidTransitionEvent({
        event_name: event.event_name,
        principal_id: event.principal_id,
        correlation_id: event.correlation_id,
        payload: event.payload,
      }),
    ).not.toThrow(AuditShapeError);
  });

  it("operator close requires the operator transition scope", async () => {
    const store = new MemoryTicketStore();
    const repo = createEmployerReqRepo({
      store,
      allocateIdentifier: async () => "ER-2026-00001",
    });
    const draft = await repo.insertDraft(employerPrincipal, draftFields);
    await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "submitted",
      principal: employerPrincipal,
    });
    await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "open",
      principal: employerPrincipal,
    });

    await expect(
      repo.transition({
        employer_req_ticket_id: draft.employer_req_ticket_id,
        to: "closed",
        principal: operatorPrincipal,
        reason_code: "policy",
      }),
    ).rejects.toBeInstanceOf(MissingScopeError);

    expect(store.employerReqs[0].state).toBe("open");

    const closed = await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "closed",
      principal: operatorPrincipal,
      scopes: [OPERATOR_TRANSITION_SCOPE],
      reason_code: "policy",
    });
    expect(closed.state).toBe("closed");
  });

  it("records partial fills with matching self-loop until headcount is full", async () => {
    const store = new MemoryTicketStore();
    const repo = createEmployerReqRepo({
      store,
      allocateIdentifier: async () => "ER-2026-00001",
    });
    const draft = await repo.insertDraft(employerPrincipal, draftFields);
    await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "submitted",
      principal: employerPrincipal,
    });
    await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "open",
      principal: employerPrincipal,
    });
    await repo.transition({
      employer_req_ticket_id: draft.employer_req_ticket_id,
      to: "matching",
      principal: employerPrincipal,
    });

    const first = await repo.recordAcceptedMatch(draft.employer_req_ticket_id, employerPrincipal);
    const second = await repo.recordAcceptedMatch(draft.employer_req_ticket_id, employerPrincipal);
    const third = await repo.recordAcceptedMatch(draft.employer_req_ticket_id, employerPrincipal);

    expect(first.state).toBe("matching");
    expect(second.state).toBe("matching");
    expect(third.state).toBe("filled");
    expect(third.headcount_filled).toBe(3);
  });
});
