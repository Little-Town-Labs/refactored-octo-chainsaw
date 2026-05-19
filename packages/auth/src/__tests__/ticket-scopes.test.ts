// F04 T037 — Ticket scope registry tests.

import { requireScope, ScopeRequiredError } from "../authorize.js";
import type { ServicePrincipal } from "../principal.js";
import { isKnownScope, listScopes } from "../scopes.js";
import {
  OPERATOR_TICKET_TRANSITIONER,
  TICKETS_MATCH_ADVANCE_SCOPE,
  TICKET_SCOPES,
} from "../ticket-scopes.js";

const servicePrincipal: ServicePrincipal = {
  kind: "service",
  principal_id: "11111111-1111-4111-8111-000000000001",
  service_name: "parley",
  service_version: "test",
  scopes: [TICKETS_MATCH_ADVANCE_SCOPE],
};

describe("ticket scope registry", () => {
  it("declares F04 ticket scopes", () => {
    expect(isKnownScope(TICKETS_MATCH_ADVANCE_SCOPE)).toBe(true);
    expect(isKnownScope(OPERATOR_TICKET_TRANSITIONER)).toBe(true);
  });

  it("TICKET_SCOPES enumerates the declared ticket scopes", () => {
    expect(TICKET_SCOPES).toEqual([TICKETS_MATCH_ADVANCE_SCOPE, OPERATOR_TICKET_TRANSITIONER]);
    for (const scope of TICKET_SCOPES) {
      expect(listScopes()).toContain(scope);
    }
  });

  it("requireScope accepts and rejects the registered match-advance scope", () => {
    expect(requireScope(servicePrincipal, TICKETS_MATCH_ADVANCE_SCOPE)).toBe(servicePrincipal);
    expect(() => requireScope(servicePrincipal, OPERATOR_TICKET_TRANSITIONER)).toThrow(
      ScopeRequiredError,
    );
  });
});
