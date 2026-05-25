import { createEmployerReqRepo } from "../../repo/employer-req.js";
import { createMatchRepo } from "../../repo/match.js";
import { createSeekerRepo } from "../../repo/seeker.js";
import { AuditShapeError, assertValidTransitionEvent } from "../audit-shape.helper.js";
import { employerPrincipal, matcherPrincipal, seekerPrincipal } from "./fixtures.js";
import { MemoryTicketStore, testUuid } from "./memory-store.js";

describe("ticket lifecycle smoke", () => {
  it("runs seeker submit through match accepted with schema-valid audit events", async () => {
    const store = new MemoryTicketStore();
    const seekerRepo = createSeekerRepo({
      store,
      allocateIdentifier: async () => "ST-2026-00001",
    });
    const employerRepo = createEmployerReqRepo({
      store,
      allocateIdentifier: async () => "ER-2026-00001",
    });
    const matchRepo = createMatchRepo({
      store,
      allocateIdentifier: async () => "MT-2026-00001",
      createRunId: () => testUuid(777),
    });

    const seekerDraft = await seekerRepo.insertDraft(seekerPrincipal, {
      role_family: "engineering",
      comp_band_min: 100000,
      comp_band_max: 150000,
      currency: "USD",
      jurisdictions: ["US-CA"],
      work_mode: "remote",
    });
    await seekerRepo.transition({
      seeker_ticket_id: seekerDraft.seeker_ticket_id,
      to: "submitted",
      principal: seekerPrincipal,
    });
    await seekerRepo.transition({
      seeker_ticket_id: seekerDraft.seeker_ticket_id,
      to: "screening",
      principal: seekerPrincipal,
    });
    await seekerRepo.transition({
      seeker_ticket_id: seekerDraft.seeker_ticket_id,
      to: "matching",
      principal: seekerPrincipal,
    });

    const employerDraft = await employerRepo.insertDraft(employerPrincipal, {
      org_id: employerPrincipal.org_id!,
      role_title: "Senior Engineer",
      role_level: "senior",
      comp_band_min: 120000,
      comp_band_max: 180000,
      currency: "USD",
      jurisdictions: ["US-CA"],
      decision_locus_jurisdiction: "US-CA",
      work_mode: "remote",
      headcount_total: 1,
      threshold: 75,
    });
    await employerRepo.transition({
      employer_req_ticket_id: employerDraft.employer_req_ticket_id,
      to: "submitted",
      principal: employerPrincipal,
    });
    await employerRepo.transition({
      employer_req_ticket_id: employerDraft.employer_req_ticket_id,
      to: "open",
      principal: employerPrincipal,
    });
    await employerRepo.transition({
      employer_req_ticket_id: employerDraft.employer_req_ticket_id,
      to: "matching",
      principal: employerPrincipal,
    });

    const match = await matchRepo.createMatch({
      seeker_ticket_id: seekerDraft.seeker_ticket_id,
      employer_req_ticket_id: employerDraft.employer_req_ticket_id,
      principal: matcherPrincipal,
      seeker_contract_id: "seeker-contract",
      seeker_contract_version: "1",
      employer_contract_id: "employer-contract",
      employer_contract_version: "1",
      privacy_ruleset_id: "ruleset",
      privacy_ruleset_version: "1",
      decision_locus_jurisdiction: "US-CA",
    });
    await matchRepo.advanceMatch({
      match_ticket_id: match.match_ticket_id,
      to: "negotiating",
      principal: matcherPrincipal,
    });
    await matchRepo.advanceMatch({
      match_ticket_id: match.match_ticket_id,
      to: "delivered",
      dossier_id: testUuid(701),
      run_id: testUuid(700),
      principal: matcherPrincipal,
    });
    const accepted = await matchRepo.advanceMatch({
      match_ticket_id: match.match_ticket_id,
      to: "accepted",
      principal: matcherPrincipal,
    });

    expect(accepted.state).toBe("accepted");
    expect(store.audits.map((event) => event.event_name)).toEqual([
      "seeker_ticket.submitted",
      "seeker_ticket.screening",
      "seeker_ticket.matching",
      "employer_req_ticket.submitted",
      "employer_req_ticket.open",
      "employer_req_ticket.matching",
      "match_ticket.created",
      "match_ticket.negotiating",
      "match_ticket.delivered",
      "match_ticket.accepted",
    ]);
    for (const event of store.audits) {
      expect(() =>
        assertValidTransitionEvent({
          event_name: event.event_name,
          principal_id: event.principal_id,
          correlation_id: event.correlation_id,
          payload: event.payload,
        }),
      ).not.toThrow(AuditShapeError);
    }
  });
});
