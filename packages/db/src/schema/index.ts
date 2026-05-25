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
  employerOrganizationProfiles,
  type EmployerOrganizationProfileRow,
  type NewEmployerOrganizationProfileRow,
} from "./employer-organization-profiles.js";
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

// F07b — Rubric registry and bias-test dispatch gate.
export {
  biasTestArtifacts,
  type BiasTestArtifactRow,
  type BiasTestStatus,
  BIAS_TEST_STATUSES,
  type NewBiasTestArtifactRow,
  type NewRubricDispatchGateEventRow,
  type NewRubricEventRow,
  type NewRubricVersionRow,
  RUBRIC_EVENT_REASON_CODES,
  type RubricEventReasonCode,
  RUBRIC_EVENT_TYPES,
  type RubricEventRow,
  type RubricEventType,
  RUBRIC_GATE_DECISIONS,
  type RubricGateDecision,
  RUBRIC_GATE_REASON_CODES,
  type RubricGateReasonCode,
  rubricDispatchGateEvents,
  type RubricDispatchGateEventRow,
  rubricEvents,
  RUBRIC_SIDES,
  type RubricSide,
  RUBRIC_STATUSES,
  type RubricStatus,
  rubricVersions,
  type RubricVersionRow,
} from "./rubrics.js";

// F08.5 — Tool surface registry and dispatcher.
export {
  DISCLOSURE_CLASSES,
  type DisclosureClass,
  disclosureRoutingEvidence,
  type DisclosureRoutingEvidenceRow,
  dispatcherBypassFindings,
  type DispatcherBypassFindingRow,
  type NewDisclosureRoutingEvidenceRow,
  type NewDispatcherBypassFindingRow,
  type NewToolDescriptorVersionRow,
  type NewToolDispatchEventRow,
  type NewToolSurfaceEventRow,
  type NewToolSurfaceVersionRow,
  TOOL_DISPATCH_REASON_CODES,
  type ToolDispatchReasonCode,
  TOOL_DISPATCH_STATUSES,
  type ToolDispatchStatus,
  toolDescriptorVersions,
  type ToolDescriptorVersionRow,
  toolDispatchEvents,
  type ToolDispatchEventRow,
  toolSurfaceEvents,
  type ToolSurfaceEventRow,
  TOOL_STATUSES,
  type ToolStatus,
  TOOL_SURFACE_SIDES,
  type ToolSurfaceSide,
  toolSurfaceVersions,
  type ToolSurfaceVersionRow,
} from "./tool-surfaces.js";

// F09 — Privacy filter.
export {
  counterpartyAccessFindings,
  type CounterpartyAccessFindingRow,
  type NewCounterpartyAccessFindingRow,
  type NewPrivacyFilterDecisionRow,
  type NewPrivacyRulesetVersionRow,
  type NewSentinelFailureRow,
  PRIVACY_AUDIENCES,
  type PrivacyAudience,
  PRIVACY_FILTER_DECISIONS,
  privacyFilterDecisions,
  type PrivacyFilterDecision,
  type PrivacyFilterDecisionRow,
  PRIVACY_FINDING_STATUSES,
  type PrivacyFindingStatus,
  PRIVACY_INPUT_CLASSES,
  type PrivacyInputClass,
  PRIVACY_RULESET_STATUSES,
  privacyRulesetVersions,
  type PrivacyRulesetStatus,
  type PrivacyRulesetVersionRow,
  sentinelFailures,
  type SentinelFailureRow,
} from "./privacy-filter.js";

// F10 — Dossier builder and signer.
export {
  DOSSIER_AUDIENCES,
  dossierArtifacts,
  type DossierArtifactRow,
  type DossierAudience,
  dossierProjections,
  type DossierProjectionRow,
  dossierSignatures,
  type DossierSignatureRow,
  DOSSIER_STATUSES,
  type DossierStatus,
  DOSSIER_VERIFICATION_DECISIONS,
  type DossierVerificationDecision,
  dossierVerificationEvents,
  type DossierVerificationEventRow,
  type NewDossierArtifactRow,
  type NewDossierProjectionRow,
  type NewDossierSignatureRow,
  type NewDossierVerificationEventRow,
} from "./dossiers.js";

// F11 — Candidate notification artifacts.
export {
  candidateNotificationArtifacts,
  type CandidateNotificationArtifactRow,
  candidateNotificationDeliveryCommands,
  candidateNotificationGateEvents,
  candidateNoticeTemplateVersions,
  CHANNEL_INTENTS,
  type ChannelIntent,
  NOTIFICATION_ARTIFACT_STATUSES,
  type NotificationArtifactStatus,
  NOTIFICATION_DELIVERY_STATUSES,
  type NotificationDeliveryStatus,
  NOTIFICATION_GATE_DECISIONS,
  type NotificationGateDecision,
  NOTICE_CATEGORIES,
  type NoticeCategory,
  NOTICE_TEMPLATE_STATUSES,
  type NoticeTemplateStatus,
  type NewCandidateNotificationArtifactRow,
  type NewCandidateNotificationDeliveryCommandRow,
  type NewCandidateNotificationGateEventRow,
  type NewCandidateNoticeTemplateVersionRow,
  type NotificationDeliveryCommandRow,
  type NotificationGateEventRow,
  type NoticeTemplateVersionRow,
} from "./candidate-notifications.js";

// F12 — AI infrastructure.
export {
  AI_RUNTIME_MANIFEST_STATUSES,
  AI_VERSION_STATUSES,
  aiRuntimeManifests,
  type AiRuntimeManifestRow,
  type AiRuntimeManifestStatus,
  type AiVersionStatus,
  MODEL_CAPABILITY_CLASSES,
  MODEL_INVOCATION_DECISIONS,
  MODEL_INVOCATION_STATUSES,
  modelInvocationRecords,
  type ModelCapabilityClass,
  type ModelInvocationDecision,
  type ModelInvocationRecordRow,
  type ModelInvocationStatus,
  modelProfileVersions,
  type ModelProfileVersionRow,
  type NewAiRuntimeManifestRow,
  type NewModelInvocationRecordRow,
  type NewModelProfileVersionRow,
  type NewPromptVersionRow,
  promptVersions,
  type PromptVersionRow,
} from "./ai-infrastructure.js";
