import { IllegalTransitionError } from "../../errors.js";
import { createSeekerRepo } from "../../repo/seeker.js";
import { AuditShapeError, assertValidTransitionEvent } from "../audit-shape.helper.js";
import { seekerPrincipal } from "./fixtures.js";
import { MemoryTicketStore } from "./memory-store.js";

const draftFields = {
  role_family: "engineering",
  comp_band_min: 100000,
  comp_band_max: 150000,
  currency: "USD",
  jurisdictions: ["US-CA"],
  work_mode: "remote" as const,
};

describe("seeker repo", () => {
  it("insertDraft creates a draft seeker ticket", async () => {
    const store = new MemoryTicketStore();
    const repo = createSeekerRepo({
      store,
      allocateIdentifier: async () => "ST-2026-00001",
    });

    const row = await repo.insertDraft(seekerPrincipal, draftFields);

    expect(row.state).toBe("draft");
    expect(row.identifier).toBe("ST-2026-00001");
    expect(row.principal_id).toBe(seekerPrincipal.principal_id);
    expect(store.seekers).toHaveLength(1);
  });

  it("transition validates the state edge and emits a schema-valid audit event", async () => {
    const store = new MemoryTicketStore();
    const repo = createSeekerRepo({
      store,
      allocateIdentifier: async () => "ST-2026-00001",
    });
    const draft = await repo.insertDraft(seekerPrincipal, draftFields);

    const submitted = await repo.transition({
      seeker_ticket_id: draft.seeker_ticket_id,
      to: "submitted",
      principal: seekerPrincipal,
    });

    expect(submitted.state).toBe("submitted");
    expect(store.audits).toHaveLength(1);
    const [event] = store.audits;
    expect(event.event_name).toBe("seeker_ticket.submitted");
    expect(event.correlation_id).toBe(seekerPrincipal.correlation_id);
    expect(() =>
      assertValidTransitionEvent({
        event_name: event.event_name,
        principal_id: event.principal_id,
        correlation_id: event.correlation_id,
        payload: event.payload,
      }),
    ).not.toThrow(AuditShapeError);
  });

  it("rolls back on an illegal transition", async () => {
    const store = new MemoryTicketStore();
    const repo = createSeekerRepo({
      store,
      allocateIdentifier: async () => "ST-2026-00001",
    });
    const draft = await repo.insertDraft(seekerPrincipal, draftFields);

    await expect(
      repo.transition({
        seeker_ticket_id: draft.seeker_ticket_id,
        to: "matched",
        principal: seekerPrincipal,
      }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);

    expect(store.seekers[0].state).toBe("draft");
    expect(store.audits).toHaveLength(0);
  });

  it("rolls back the row mutation when audit insert fails", async () => {
    const store = new MemoryTicketStore({ auditInsertShouldFail: true });
    const repo = createSeekerRepo({
      store,
      allocateIdentifier: async () => "ST-2026-00001",
    });
    const draft = await repo.insertDraft(seekerPrincipal, draftFields);

    await expect(
      repo.transition({
        seeker_ticket_id: draft.seeker_ticket_id,
        to: "submitted",
        principal: seekerPrincipal,
      }),
    ).rejects.toThrow("audit insert failed");

    expect(store.seekers[0].state).toBe("draft");
    expect(store.audits).toHaveLength(0);
  });
});
