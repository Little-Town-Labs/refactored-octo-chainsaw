import {
  IdempotencyConflictError,
  InvariantViolationError,
  MissingScopeError,
} from "../../errors.js";
import { createMatchRepo } from "../../repo/match.js";
import { AuditShapeError, assertValidTransitionEvent } from "../audit-shape.helper.js";
import { employerReqRow, matchRow, matcherPrincipal, seekerRow } from "./fixtures.js";
import { MemoryTicketStore, testUuid } from "./memory-store.js";

const createFields = {
  seeker_ticket_id: testUuid(101),
  employer_req_ticket_id: testUuid(201),
  principal: matcherPrincipal,
  seeker_contract_id: "seeker-contract",
  seeker_contract_version: "1",
  employer_contract_id: "employer-contract",
  employer_contract_version: "1",
  privacy_ruleset_id: "ruleset",
  privacy_ruleset_version: "1",
  decision_locus_jurisdiction: "US-CA",
};

function makeRepo(store: MemoryTicketStore) {
  return createMatchRepo({
    store,
    allocateIdentifier: async () => "MT-2026-00001",
    createRunId: () => testUuid(777),
  });
}

describe("match repo", () => {
  it("createMatch inserts a match ticket atomically and emits a valid audit event", async () => {
    const store = new MemoryTicketStore();
    store.seedSeeker(seekerRow({ state: "matching" }));
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    const repo = makeRepo(store);

    const match = await repo.createMatch(createFields);

    expect(match.state).toBe("created");
    expect(match.identifier).toBe("MT-2026-00001");
    expect(match.attempt).toBe(1);
    expect(store.matches).toHaveLength(1);
    const [event] = store.audits;
    expect(event.event_name).toBe("match_ticket.created");
    expect(() =>
      assertValidTransitionEvent({
        event_name: event.event_name,
        principal_id: event.principal_id,
        correlation_id: event.correlation_id,
        payload: event.payload,
      }),
    ).not.toThrow(AuditShapeError);
  });

  it("createMatch requires tickets.match.advance scope", async () => {
    const store = new MemoryTicketStore();
    store.seedSeeker(seekerRow({ state: "matching" }));
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    const repo = makeRepo(store);

    await expect(
      repo.createMatch({
        ...createFields,
        principal: { ...matcherPrincipal, scopes: [] },
      }),
    ).rejects.toBeInstanceOf(MissingScopeError);

    expect(store.matches).toHaveLength(0);
  });

  it("createMatch maps duplicate pair+attempt to IdempotencyConflictError", async () => {
    const store = new MemoryTicketStore();
    store.seedSeeker(seekerRow({ state: "matching" }));
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    store.seedMatch(matchRow());
    const repo = makeRepo(store);

    await expect(repo.createMatch(createFields)).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(store.matches).toHaveLength(1);
  });

  it("advanceMatch enforces delivered dossier invariant", async () => {
    const store = new MemoryTicketStore();
    store.seedMatch(matchRow({ state: "negotiating", run_id: testUuid(700) }));
    const repo = makeRepo(store);

    await expect(
      repo.advanceMatch({
        match_ticket_id: testUuid(301),
        to: "delivered",
        principal: matcherPrincipal,
      }),
    ).rejects.toBeInstanceOf(InvariantViolationError);

    const delivered = await repo.advanceMatch({
      match_ticket_id: testUuid(301),
      to: "delivered",
      principal: matcherPrincipal,
      dossier_id: testUuid(701),
    });
    expect(delivered.state).toBe("delivered");
  });

  it("renegotiate atomically bumps attempt and clears run/dossier state", async () => {
    const store = new MemoryTicketStore();
    store.seedMatch(
      matchRow({
        state: "delivered",
        run_id: testUuid(700),
        dossier_id: testUuid(701),
        round: 2,
        attempt: 1,
      }),
    );
    const repo = makeRepo(store);

    const renegotiated = await repo.renegotiate(testUuid(301), matcherPrincipal);

    expect(renegotiated.state).toBe("negotiating");
    expect(renegotiated.attempt).toBe(2);
    expect(renegotiated.round).toBe(0);
    expect(renegotiated.run_id).toBe(testUuid(777));
    expect(renegotiated.dossier_id).toBeNull();
    expect(store.audits.at(-1)?.event_name).toBe("match_ticket.renegotiated");
  });

  it("advanceRound rejects increments beyond round_cap", async () => {
    const store = new MemoryTicketStore();
    store.seedMatch(matchRow({ state: "negotiating", round: 3, round_cap: 3 }));
    const repo = makeRepo(store);

    await expect(repo.advanceRound(testUuid(301), matcherPrincipal)).rejects.toBeInstanceOf(
      InvariantViolationError,
    );
  });
});
