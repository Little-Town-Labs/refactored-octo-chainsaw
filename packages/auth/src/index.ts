// `@spyglass/auth` — Identity, authentication, and authorization
// primitives for Spyglass. Owned by feature F02; consumed by every
// later feature that mutates state.
//
// Public API exported from this entry point:
//   - Principal types and discriminator helpers (FR-1..FR-5)
//   - Scope registry (FR-30, FR-31, FR-32)
//   - Guard surface (FR-36, FR-37)
//
// Internal helpers (`__resetScopeRegistryForTests`, etc.) are not
// re-exported. Tests import them from their concrete modules.

export const __pkg = "@spyglass/auth" as const;

export type {
  AgentPrincipal,
  AgentSide,
  HumanPrincipal,
  HumanTier,
  Principal,
  PrincipalKind,
  ServicePrincipal,
} from "./principal.js";
export { isAgentPrincipal, isHumanPrincipal, isServicePrincipal } from "./principal.js";

export type { Scope } from "./scopes.js";
export {
  declareScope,
  hasScope,
  InvalidScopeNameError,
  isKnownScope,
  listScopes,
  ScopeAlreadyDeclaredError,
} from "./scopes.js";

export type { PrincipalContext, PrincipalResolver } from "./guard.js";
export {
  AnonymousAccessError,
  getPrincipal,
  PrincipalRequiredError,
  withPrincipal,
} from "./guard.js";

// --- Authorization (B3) --------------------------------------------

export { requireRole, requireScope, RoleRequiredError, ScopeRequiredError } from "./authorize.js";

export {
  OPERATOR_CREDENTIAL_ISSUER,
  OPERATOR_DOSSIER_VIEWER,
  OPERATOR_POLICY_GATE,
  OPERATOR_SCOPES,
} from "./operator-roles.js";

// --- Materialization (B2) ------------------------------------------

export type {
  AuditEventName,
  AuditEventSink,
  MaterializationSource,
  OrganizationLookup,
  PrincipalLookup,
  PrincipalRepo,
  PrincipalSnapshot,
} from "./materialize/types.js";
export {
  materializePrincipal,
  PrincipalDisabledError,
  PrincipalSnapshotInvariantError,
} from "./materialize/materialize.js";

// --- AAL2 enforcement (B3) -----------------------------------------

export type { AalDecision, AalLevel, AalSignal } from "./aal.js";
export { evaluateAal, evaluateTierAal, tierRequiresAal2 } from "./aal.js";

// --- Proxy / audience gate (B2) ------------------------------------

export type { AudienceDecision, RouteAudience } from "./proxy/audience.js";
export { audienceForPath, evaluateAudience, evaluateAudienceByTier } from "./proxy/audience.js";

export type { ClerkSessionInput } from "./proxy/clerk-session.js";
export { clerkSessionToTier, parseOperatorClerkOrgIds } from "./proxy/clerk-session.js";

export type { RouteAccessInput, RouteDecision } from "./proxy/decide-access.js";
export { decideRouteAccess } from "./proxy/decide-access.js";

// --- Clerk webhook surface (B2) ------------------------------------

export type { ClerkWebhookEvent, ClerkWebhookEventType } from "./webhook/clerk-events.js";
export { ClerkWebhookPayloadError, parseClerkWebhookEvent } from "./webhook/clerk-events.js";

export type { ClerkWebhookHeaders } from "./webhook/verify.js";
export { verifyClerkWebhook, WebhookSignatureError } from "./webhook/verify.js";

export type { SnapshotContext, SnapshotResult, TerminationDirective } from "./webhook/snapshot.js";
export { eventToSnapshot } from "./webhook/snapshot.js";

export type { ClerkSessionRevoker, ProcessDirectiveDeps } from "./webhook/processor.js";
export { processClerkDirective } from "./webhook/processor.js";

// --- Issuer / Verifier (B4) ----------------------------------------

export type {
  AgentCredentialPurpose,
  AgentJwtClaims,
  MintRequest,
  MintResult,
} from "./issuer/types.js";
export { MAX_TTL_SECONDS } from "./issuer/types.js";
export type { JwksProvider, SigningKeyMaterial } from "./issuer/key-source.js";
export { exportPrivateKeyPkcs8, generateEdDSAKeypair, type EdDSAKeypair } from "./issuer/keygen.js";
export {
  EmptyScopeSetError,
  InvalidTtlError,
  mintAgentCredential,
  TtlExceededError,
} from "./issuer/mint.js";
export type {
  AgentCredentialRepo,
  AgentCredentialRow,
  IssueAgentInput,
  IssueAgentOutput,
} from "./issuer/issuance.js";
export {
  AGENT_CREDENTIAL_ISSUE_SCOPE,
  DEFAULT_TTL_SECONDS,
  IssuanceConflictError,
  issueAgentCredential,
  UniqueViolationError,
} from "./issuer/issuance.js";

export type {
  ListRevokedDeps,
  ListRevokedInput,
  PruneRevocationsDeps,
  RevocationListEntry,
  RevocationListRepo,
  RevocationReasonCode,
  RevokeAgentInput,
  RevokeAgentOutput,
  RevokeRepo,
} from "./issuer/revocation.js";
export {
  AGENT_CREDENTIAL_REVOKE_SCOPE,
  listRevoked,
  pruneExpiredRevocations,
  REVOCATION_LIST_READ_SCOPE,
  revokeAgentCredential,
} from "./issuer/revocation.js";

export type {
  RevocationChecker,
  VerificationFailureReason,
  VerifyOptions,
} from "./verifier/verify.js";
export { CredentialVerificationError, verifyAgentCredential } from "./verifier/verify.js";

export type { Jwks, JwksKeyRow, JwksRepo } from "./jwks/types.js";
export { isJwksVisible } from "./jwks/types.js";
export { buildJwks } from "./jwks/build.js";

// --- Reconciliation (B2 / EC-2) ------------------------------------

export type {
  ClerkOrgIndex,
  ClerkRosterEntry,
  DbPrincipalEntry,
  ReconciliationReport,
} from "./reconciliation.js";
export { reconcilePrincipals } from "./reconciliation.js";
