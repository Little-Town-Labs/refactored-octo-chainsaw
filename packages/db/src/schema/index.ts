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

// F05 — Canonical audit log, transcript store, and tombstones.
export {
  auditLogEvents,
  evidenceExports,
  tombstoneRecords,
  type AuditLogEventRow,
  type EvidenceExportPurpose,
  EVIDENCE_EXPORT_PURPOSES,
  type EvidenceExportRow,
  type NewAuditLogEventRow,
  type NewEvidenceExportRow,
  type NewTombstoneRecordRow,
  PRINCIPAL_KINDS,
  type PrincipalKind,
  TOMBSTONE_TARGET_KINDS,
  type TombstoneRecordRow,
  type TombstoneTargetKind,
} from "./audit-log.js";
export {
  transcriptTurns,
  type NewTranscriptTurnRow,
  TRANSCRIPT_SIDES,
  type TranscriptSide,
  type TranscriptTurnRow,
} from "./transcript-store.js";

// F06 — Jurisdiction policy gates.
export {
  jurisdictionGateDecisions,
  type JurisdictionGateDecision,
  JURISDICTION_GATE_DECISIONS,
  type JurisdictionGateDecisionRow,
  type JurisdictionGateReasonCode,
  JURISDICTION_GATE_REASON_CODES,
  type JurisdictionGateSubjectKind,
  JURISDICTION_GATE_SUBJECT_KINDS,
  jurisdictionKillSwitchEvents,
  type JurisdictionKillSwitchEventRow,
  type JurisdictionKillSwitchReasonCode,
  JURISDICTION_KILL_SWITCH_REASON_CODES,
  jurisdictionPolicies,
  type JurisdictionPolicyRow,
  type JurisdictionPolicyStatus,
  JURISDICTION_POLICY_STATUSES,
  type NewJurisdictionGateDecisionRow,
  type NewJurisdictionKillSwitchEventRow,
  type NewJurisdictionPolicyRow,
} from "./jurisdiction-policy.js";

// F07a — Agent contract registry.
export {
  agentContractEvents,
  type AgentContractEventReasonCode,
  AGENT_CONTRACT_EVENT_REASON_CODES,
  AGENT_CONTRACT_EVENT_TYPES,
  type AgentContractEventRow,
  type AgentContractEventType,
  AGENT_CONTRACT_SIDES,
  AGENT_CONTRACT_STATUSES,
  agentContractVersions,
  type AgentContractSide,
  type AgentContractStatus,
  type AgentContractVersionRow,
  type NewAgentContractEventRow,
  type NewAgentContractVersionRow,
} from "./agent-contracts.js";
