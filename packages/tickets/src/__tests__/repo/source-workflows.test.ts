import { TicketAuthorizationError, createSourceWorkflowRepo } from "../../repo/source-workflows.js";
import {
  employerPrincipal,
  employerReqRow,
  matchRow,
  seekerPrincipal,
  seekerRow,
} from "./fixtures.js";
import { MemoryTicketStore, testUuid } from "./memory-store.js";

describe("source ticket workflows", () => {
  it("withdraws a seeker and rejects the active negotiating match atomically", async () => {
    const store = new MemoryTicketStore();
    store.seedSeeker(seekerRow({ state: "matching" }));
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    store.seedMatch(matchRow({ state: "negotiating" }));
    const repo = createSourceWorkflowRepo({ store });

    const result = await repo.withdrawSeekerIntent(seekerPrincipal, testUuid(101));

    expect(result.seeker.state).toBe("withdrawn");
    expect(result.rejectedMatch?.state).toBe("rejected");
    expect(store.seekers[0].state).toBe("withdrawn");
    expect(store.matches[0].state).toBe("rejected");
    expect(store.audits.map((event) => event.event_name)).toEqual([
      "seeker_ticket.withdrawn",
      "match_ticket.rejected",
    ]);
    expect(new Set(store.audits.map((event) => event.correlation_id))).toEqual(
      new Set([seekerPrincipal.correlation_id]),
    );
    expect(store.audits[1].payload).toMatchObject({
      reason_code: "source_withdrawn",
      seeker_ticket_id: testUuid(101),
      employer_req_ticket_id: testUuid(201),
    });
  });

  it("rolls back source withdrawal when the cascade audit insert fails", async () => {
    const store = new MemoryTicketStore({ auditInsertShouldFail: true });
    store.seedSeeker(seekerRow({ state: "matching" }));
    store.seedMatch(matchRow({ state: "negotiating" }));
    const repo = createSourceWorkflowRepo({ store });

    await expect(repo.withdrawSeekerIntent(seekerPrincipal, testUuid(101))).rejects.toThrow(
      "audit insert failed",
    );

    expect(store.seekers[0].state).toBe("matching");
    expect(store.matches[0].state).toBe("negotiating");
    expect(store.audits).toHaveLength(0);
  });

  it("amends a seeker without jurisdiction cascade as one redacted audit event", async () => {
    const store = new MemoryTicketStore();
    store.seedSeeker(seekerRow({ state: "matching", jurisdictions: ["US-CA"] }));
    store.seedMatch(matchRow({ state: "negotiating", decision_locus_jurisdiction: "US-CA" }));
    const repo = createSourceWorkflowRepo({ store });

    const result = await repo.amendSeekerIntent(seekerPrincipal, testUuid(101), {
      comp_band_min: 110000,
      jurisdictions: ["US-CA", "US-NY"],
    });

    expect(result.seeker.comp_band_min).toBe(110000);
    expect(result.rejectedMatch).toBeNull();
    expect(store.matches[0].state).toBe("negotiating");
    expect(store.audits).toHaveLength(1);
    expect(store.audits[0]).toMatchObject({
      event_name: "seeker_ticket.amended",
      correlation_id: seekerPrincipal.correlation_id,
    });
    expect(store.audits[0].payload).toEqual({
      ticket_id: testUuid(101),
      ticket_identifier: "ST-2026-00001",
      ticket_kind: "seeker",
      patched_fields: ["comp_band_min", "jurisdictions"],
      prior_values_present: true,
    });
  });

  it("amends source jurisdiction and rejects the active match with one correlation id", async () => {
    const store = new MemoryTicketStore();
    store.seedSeeker(seekerRow({ state: "matching", jurisdictions: ["US-CA"] }));
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    store.seedMatch(matchRow({ state: "negotiating", decision_locus_jurisdiction: "US-CA" }));
    const repo = createSourceWorkflowRepo({ store });

    await repo.amendSeekerIntent(seekerPrincipal, testUuid(101), {
      jurisdictions: ["US-NY"],
    });

    expect(store.matches[0].state).toBe("rejected");
    expect(store.audits.map((event) => event.event_name)).toEqual([
      "seeker_ticket.amended",
      "match_ticket.rejected",
    ]);
    expect(new Set(store.audits.map((event) => event.correlation_id))).toEqual(
      new Set([seekerPrincipal.correlation_id]),
    );
    expect(store.audits[1].payload).toMatchObject({ reason_code: "jurisdiction_changed" });
  });

  it("rejects cross-tier employer amendments", async () => {
    const store = new MemoryTicketStore();
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    const repo = createSourceWorkflowRepo({ store });

    await expect(
      repo.amendEmployerRequisition(seekerPrincipal, testUuid(201), { jurisdictions: ["US-NY"] }),
    ).rejects.toThrow();
    expect(store.audits).toHaveLength(0);
  });

  it("rejects employer amendments for another organization", async () => {
    const store = new MemoryTicketStore();
    store.seedEmployerReq(employerReqRow({ state: "matching", org_id: testUuid(999) }));
    const repo = createSourceWorkflowRepo({ store });

    await expect(
      repo.amendEmployerRequisition(employerPrincipal, testUuid(201), {
        jurisdictions: ["US-NY"],
      }),
    ).rejects.toBeInstanceOf(TicketAuthorizationError);
    expect(store.audits).toHaveLength(0);
  });
});
