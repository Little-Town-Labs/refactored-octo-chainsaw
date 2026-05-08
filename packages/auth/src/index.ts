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

// --- Materialization (B2) ------------------------------------------

export type {
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

// --- Proxy / audience gate (B2) ------------------------------------

export type { AudienceDecision, RouteAudience } from "./proxy/audience.js";
export { audienceForPath, evaluateAudience, evaluateAudienceByTier } from "./proxy/audience.js";

export type { ClerkSessionInput } from "./proxy/clerk-session.js";
export { clerkSessionToTier } from "./proxy/clerk-session.js";

// --- Clerk webhook surface (B2) ------------------------------------

export type { ClerkWebhookEvent, ClerkWebhookEventType } from "./webhook/clerk-events.js";
export { ClerkWebhookPayloadError, parseClerkWebhookEvent } from "./webhook/clerk-events.js";

export type { ClerkWebhookHeaders } from "./webhook/verify.js";
export { verifyClerkWebhook, WebhookSignatureError } from "./webhook/verify.js";

export type { SnapshotContext, SnapshotResult, TerminationDirective } from "./webhook/snapshot.js";
export { eventToSnapshot } from "./webhook/snapshot.js";
