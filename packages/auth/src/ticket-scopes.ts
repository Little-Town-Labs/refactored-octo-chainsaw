// F04 T037 — Ticket capability scopes.
//
// F04 owns ticket state machines and match advancement, but the scope
// registry lives in @spyglass/auth. Declaring these here makes the
// capabilities discoverable to authorization guards and operator-role
// documentation without coupling auth to ticket repository code.

import { declareScope, type Scope } from "./scopes.js";

/** Service-principal authority to create and advance match tickets. */
export const TICKETS_MATCH_ADVANCE_SCOPE: Scope = declareScope(
  "tickets.match.advance",
  "Create and advance match tickets from service-principal workflows.",
);

/** Operator authority to force governed ticket state transitions. */
export const OPERATOR_TICKET_TRANSITIONER: Scope = declareScope(
  "tickets.transition.operator",
  "Perform operator-governed ticket transitions with a reason code.",
);

/** Stable list for documentation, audit, and scope inventory checks. */
export const TICKET_SCOPES: ReadonlyArray<Scope> = [
  TICKETS_MATCH_ADVANCE_SCOPE,
  OPERATOR_TICKET_TRANSITIONER,
];
