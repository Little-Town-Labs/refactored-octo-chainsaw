import type { HumanPrincipal, ServicePrincipal } from "@spyglass/auth";
import type { MatchTicketRow } from "@spyglass/db";
import {
  IdempotencyConflictError,
  InvariantViolationError,
  MATCH_ADVANCE_SCOPE,
} from "@spyglass/tickets";

import { createTicketsProcedures, resolverForPrincipal, TicketProcedureError } from "../tickets";

const servicePrincipal: ServicePrincipal = {
  kind: "service",
  principal_id: "11111111-1111-4111-8111-000000000901",
  issued_at: 1,
  correlation_id: "corr-service",
  service_name: "matcher",
  service_version: "test",
  scopes: [MATCH_ADVANCE_SCOPE],
};

const humanPrincipal: HumanPrincipal = {
  kind: "human",
  principal_id: "11111111-1111-4111-8111-000000000902",
  issued_at: 1,
  correlation_id: "corr-human",
  tier: "operator",
  external_idp: "clerk",
  external_id: "operator",
};

function matchRow(state = "created"): MatchTicketRow {
  return {
    match_ticket_id: "11111111-1111-4111-8111-000000000401",
    identifier: "MT-2026-00001",
    seeker_ticket_id: "11111111-1111-4111-8111-000000000201",
    employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
    state,
    round: 0,
    round_cap: 3,
    run_id: null,
    attempt: 1,
    seeker_contract_id: "seeker-contract",
    seeker_contract_version: "1",
    employer_contract_id: "employer-contract",
    employer_contract_version: "1",
    privacy_ruleset_id: "ruleset",
    privacy_ruleset_version: "1",
    decision_locus_jurisdiction: "US-CA",
    flags: [],
    dossier_id: null,
    created_at: new Date(0),
    updated_at: new Date(0),
    disabled_at: null,
  };
}

function createMatchInput() {
  return {
    seeker_ticket_id: "11111111-1111-4111-8111-000000000201",
    employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
    seeker_contract_id: "seeker-contract",
    seeker_contract_version: "1",
    employer_contract_id: "employer-contract",
    employer_contract_version: "1",
    privacy_ruleset_id: "ruleset",
    privacy_ruleset_version: "1",
    decision_locus_jurisdiction: "US-CA",
  };
}

describe("tickets procedures", () => {
  it("routes createMatch with a scoped service principal", async () => {
    const matchRepo = {
      createMatch: jest.fn().mockResolvedValue(matchRow()),
      advanceMatch: jest.fn(),
      renegotiate: jest.fn(),
    };
    const procedures = createTicketsProcedures({ matchRepo });

    await expect(
      procedures.createMatch(resolverForPrincipal(servicePrincipal), createMatchInput()),
    ).resolves.toMatchObject({ state: "created" });
    expect(matchRepo.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: servicePrincipal,
        scopes: [MATCH_ADVANCE_SCOPE],
      }),
    );
  });

  it("rejects human callers and service callers without tickets.match.advance", async () => {
    const matchRepo = {
      createMatch: jest.fn(),
      advanceMatch: jest.fn(),
      renegotiate: jest.fn(),
    };
    const procedures = createTicketsProcedures({ matchRepo });

    await expect(
      procedures.createMatch(resolverForPrincipal(humanPrincipal), createMatchInput()),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", httpStatus: 401 });
    await expect(
      procedures.createMatch(
        resolverForPrincipal({ ...servicePrincipal, scopes: [] }),
        createMatchInput(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", httpStatus: 403 });
    expect(matchRepo.createMatch).not.toHaveBeenCalled();
  });

  it("maps duplicate createMatch attempts to 409 conflict", async () => {
    const matchRepo = {
      createMatch: jest
        .fn()
        .mockRejectedValue(
          new IdempotencyConflictError(
            "11111111-1111-4111-8111-000000000201",
            "11111111-1111-4111-8111-000000000301",
            1,
          ),
        ),
      advanceMatch: jest.fn(),
      renegotiate: jest.fn(),
    };
    const procedures = createTicketsProcedures({ matchRepo });

    await expect(
      procedures.createMatch(resolverForPrincipal(servicePrincipal), createMatchInput()),
    ).rejects.toBeInstanceOf(TicketProcedureError);
    await expect(
      procedures.createMatch(resolverForPrincipal(servicePrincipal), createMatchInput()),
    ).rejects.toMatchObject({ code: "CONFLICT", httpStatus: 409 });
  });

  it("maps delivered without dossier_id to bad request", async () => {
    const matchRepo = {
      createMatch: jest.fn(),
      advanceMatch: jest
        .fn()
        .mockRejectedValue(
          new InvariantViolationError("match_ticket.dossier_id_required", "missing dossier"),
        ),
      renegotiate: jest.fn(),
    };
    const procedures = createTicketsProcedures({ matchRepo });

    await expect(
      procedures.advanceMatch(resolverForPrincipal(servicePrincipal), {
        match_ticket_id: "11111111-1111-4111-8111-000000000401",
        to: "delivered",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", httpStatus: 400 });
  });

  it("routes renegotiate to the match repo", async () => {
    const matchRepo = {
      createMatch: jest.fn(),
      advanceMatch: jest.fn(),
      renegotiate: jest.fn().mockResolvedValue(matchRow("negotiating")),
    };
    const procedures = createTicketsProcedures({ matchRepo });

    await expect(
      procedures.renegotiate(resolverForPrincipal(servicePrincipal), {
        match_ticket_id: "11111111-1111-4111-8111-000000000401",
      }),
    ).resolves.toMatchObject({ state: "negotiating" });
    expect(matchRepo.renegotiate).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-000000000401",
      servicePrincipal,
    );
  });
});
