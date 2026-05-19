// F04 T011 — State-enum re-exports (plan §3 R-1).
//
// `@spyglass/db` is the single source of truth for the state arrays
// (they double as the `CHECK` constraint values in the Drizzle schema
// modules — defense-in-depth per Constitution §I.6). This module
// re-exports them so consumers of `@spyglass/tickets` can pin to one
// import path without reaching into the db package's schema layout.

export {
  SEEKER_STATES,
  EMPLOYER_REQ_STATES,
  MATCH_STATES,
  type SeekerTicketState,
  type EmployerReqTicketState,
  type MatchTicketState,
} from "@spyglass/db";

export type TicketKind = "seeker_ticket" | "employer_req_ticket" | "match_ticket";
