// F02 contributes the `principals` and `organizations` tables to the
// `@spyglass/db` schema; F03 will own the broader umbrella. Drizzle
// Kit reads this file via `schema: "./src/schema.ts"` (see
// `drizzle.config.ts`); the re-export below keeps `./src/schema.ts`
// minimal while the per-table modules stay focused.

export { organizations, type NewOrganizationRow, type OrganizationRow } from "./organizations.js";
export { principals, type NewPrincipalRow, type PrincipalRow } from "./principals.js";
export {
  agentCredentials,
  type AgentCredentialRow,
  type NewAgentCredentialRow,
} from "./agent-credentials.js";
export { signingKeys, type NewSigningKeyRow, type SigningKeyRow } from "./signing-keys.js";
export { revocations, type NewRevocationRow, type RevocationRow } from "./revocations.js";
export {
  serviceCredentials,
  type NewServiceCredentialRow,
  type ServiceCredentialRow,
} from "./service-credentials.js";
export {
  auditEventsBuffer,
  type AuditEventsBufferRow,
  type NewAuditEventsBufferRow,
} from "./audit-events-buffer.js";
export {
  revokeAllSessionsApprovals,
  type RevokeAllSessionsApprovalRow,
  type NewRevokeAllSessionsApprovalRow,
} from "./revoke-all-sessions-approvals.js";

// F04 — Ticket store + state machines.
export {
  seekerTickets,
  type NewSeekerTicketRow,
  type SeekerTicketRow,
  type SeekerTicketState,
  SEEKER_STATES,
  WORK_MODES,
  type WorkMode,
} from "./seeker-tickets.js";
export {
  employerReqTickets,
  type NewEmployerReqTicketRow,
  type EmployerReqTicketRow,
  type EmployerReqTicketState,
  EMPLOYER_REQ_STATES,
  ROLE_LEVELS,
  type RoleLevel,
} from "./employer-req-tickets.js";
export {
  matchTickets,
  type NewMatchTicketRow,
  type MatchTicketRow,
  type MatchTicketState,
  MATCH_STATES,
} from "./match-tickets.js";
