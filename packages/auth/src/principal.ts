// F02 T003 — Principal discriminated union (FR-1, FR-2, FR-3, FR-4, FR-5).
//
// Every actor that can authenticate to Spyglass — human user, hosted
// agent, or platform service — is represented by a `Principal` value.
// The discriminator (`kind`) is exhaustive at the type level so
// consumers cannot conflate kinds at compile time (Story 7).
//
// `principal_id` is opaque to consumers and distinct from any external
// IdP identifier (FR-2). External IDs live in kind-specific fields and
// are recorded only for traceability.
//
// Constitution refs: §I.5.1 (authentication), §I.5.3 (accountability),
// §II (agent identity is first-class). Spec refs: spec.md §4.1.

/** Tiers that a human principal can hold (FR-3). */
export type HumanTier = "seeker" | "employer_admin" | "employer_member" | "operator";

/** Sides of a Parley negotiation (FR-4). */
export type AgentSide = "seeker" | "employer";

interface PrincipalBase {
  /** Opaque, stable, system-of-record identifier (FR-2). */
  readonly principal_id: string;
  /** Unix seconds — when the credential producing this principal was issued. */
  readonly issued_at: number;
  /** Per-request correlation id, propagated to every audit event (NFR-10). */
  readonly correlation_id: string;
}

export interface HumanPrincipal extends PrincipalBase {
  readonly kind: "human";
  readonly tier: HumanTier;
  readonly external_idp: "clerk";
  readonly external_id: string;
  /** Required when tier ∈ {employer_admin, employer_member, operator} (data-model invariant). */
  readonly org_id?: string;
}

export interface AgentPrincipal extends PrincipalBase {
  readonly kind: "agent";
  readonly run_id: string;
  readonly side: AgentSide;
  readonly contract_id: string;
  readonly contract_version: string;
  readonly ticket_id: string;
  /** Scope set bound at issuance; cannot be expanded (FR-19). */
  readonly scopes: ReadonlyArray<string>;
}

export interface ServicePrincipal extends PrincipalBase {
  readonly kind: "service";
  readonly service_name: string;
  readonly service_version: string;
  readonly scopes: ReadonlyArray<string>;
}

export type Principal = HumanPrincipal | AgentPrincipal | ServicePrincipal;

/** Type-level kind extractor. */
export type PrincipalKind = Principal["kind"];

// --- type guards ---------------------------------------------------

export function isHumanPrincipal(p: Principal): p is HumanPrincipal {
  return p.kind === "human";
}

export function isAgentPrincipal(p: Principal): p is AgentPrincipal {
  return p.kind === "agent";
}

export function isServicePrincipal(p: Principal): p is ServicePrincipal {
  return p.kind === "service";
}
