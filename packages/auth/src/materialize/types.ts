// F02 T019 — Materializer types.
//
// The materializer takes a normalized `PrincipalSnapshot` (produced
// either eagerly from a Clerk webhook or lazily from a Clerk session
// at request time) and ensures the corresponding `principals` row
// exists. It returns the typed runtime `HumanPrincipal` consumers
// downstream of the guard rely on (FR-2, FR-37).
//
// The repository surface is an interface (`PrincipalRepo`) so unit
// tests can drive it with in-memory fakes; production wiring in
// `apps/web` provides a Drizzle-backed implementation.

import type { HumanTier } from "../principal.js";

/**
 * Normalized snapshot of one Clerk session OR one Clerk webhook
 * event after the orchestrator has resolved the audience tier and
 * org context. The materializer never touches Clerk directly.
 */
export interface PrincipalSnapshot {
  /** Clerk user ID (`user_xxx`). External IdP identifier per FR-2. */
  readonly external_id: string;
  /** Spyglass tier resolved from Clerk membership/role. */
  readonly tier: HumanTier;
  /**
   * Clerk org ID, when the session is in an org context. The
   * materializer translates this to the internal `org_id` via
   * `findOrCreateOrganization`. Required for non-seeker tiers.
   */
  readonly org_clerk_id?: string;
  /** Internal organization kind — operator vs employer. */
  readonly org_kind?: "employer" | "operator";
  /** Optional org display name to seed when first encountered. */
  readonly org_display_name?: string;
  /** Optional human display name (audit-readability only, FR-2). */
  readonly display_name?: string;
}

export interface OrganizationLookup {
  readonly org_id: string;
  readonly clerk_org_id: string;
  readonly kind: "employer" | "operator";
}

export interface PrincipalLookup {
  readonly principal_id: string;
  readonly external_id: string;
  readonly tier: HumanTier;
  readonly org_id: string | null;
  readonly disabled_at: Date | null;
}

/**
 * The repository surface the materializer consumes. Implementations
 * may be Drizzle-backed (production), in-memory (unit tests), or
 * fixture-backed (integration tests).
 */
export interface PrincipalRepo {
  findOrganizationByClerkId(clerkOrgId: string): Promise<OrganizationLookup | null>;
  upsertOrganization(input: {
    clerk_org_id: string;
    kind: "employer" | "operator";
    display_name: string;
  }): Promise<OrganizationLookup>;

  findHumanPrincipal(input: {
    external_id: string;
    org_id: string | null;
  }): Promise<PrincipalLookup | null>;
  upsertHumanPrincipal(input: {
    external_id: string;
    tier: HumanTier;
    org_id: string | null;
    display_name: string | null;
  }): Promise<PrincipalLookup>;

  /**
   * Mark a principal as disabled. Used by member-removal flows
   * (FR-34) and operator revoke-all actions. Idempotent.
   */
  disablePrincipal(input: {
    external_id: string;
    org_id: string | null;
    reason: string;
  }): Promise<void>;
}

/**
 * Discriminator union for F02 audit event names. Extended per
 * sub-phase as new event sources land. F05 will replace this with
 * the canonical audit-pipeline registry; the names here are stable
 * because the buffer-table writer ingests them unchanged.
 */
export type AuditEventName =
  | "principal.materialized"
  | "principal.disabled"
  | "organization.materialized"
  | "agent_credential.issued"
  | "agent_credential.issue_denied"
  | "agent_credential.issued_by_operator"
  | "agent_credential.issue_by_operator_denied"
  | "agent_credential.revoked"
  | "service_credential.bootstrapped"
  | "service_credential.bootstrap_denied"
  | "service_credential.rotated"
  | "service_credential.rotation_denied"
  | "service_credential.rejected_vercel_oidc";

/**
 * Sink for F02 audit events (NFR-10). Production wiring delivers to
 * F05's audit pipeline (via the buffer table for v0). Tests inject a
 * recording sink to assert events fired.
 */
export interface AuditEventSink {
  emit(event: {
    name: AuditEventName;
    principal_id?: string;
    correlation_id: string;
    payload: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}

/**
 * Distinguishes lazy (request-time) vs eager (webhook-time)
 * materialization paths for audit attribution and EC-1 / EC-2
 * tracing.
 */
export type MaterializationSource = "lazy" | "eager";
