// F02 T018 — Clerk session → tier inference (FR-9, FR-29).
//
// Pure function the Next.js middleware uses to decide audience
// membership *without* a database round-trip. The middleware runs on
// every request; full materialization (`materializePrincipal`) is the
// lazy/eager path that lands at request handlers via `getPrincipal()`.
//
// Tier rules:
//   - no session                     -> null  (unauthenticated)
//   - session, no orgId              -> "seeker"
//   - session, orgId in operatorIds  -> "operator"
//   - session, orgId other, admin    -> "employer_admin"
//   - session, orgId other, member   -> "employer_member"
//
// The "operator" decision is config-driven (FR-9: operator role is
// managed by Spyglass-side configuration, not Clerk self-service).

import type { HumanTier } from "../principal.js";

export interface ClerkSessionInput {
  /** Clerk userId (`user_xxx`) — null if no session. */
  readonly userId: string | null;
  /** Active Clerk orgId (`org_xxx`) — null when seeker session. */
  readonly orgId: string | null;
  /** Clerk org role (e.g., `"org:admin"`) — null when no orgId. */
  readonly orgRole: string | null;
  /** Spyglass-configured operator Clerk org IDs (FR-9). */
  readonly operatorClerkOrgIds: ReadonlySet<string>;
}

export function clerkSessionToTier(input: ClerkSessionInput): HumanTier | null {
  if (input.userId === null) return null;
  if (input.orgId === null) return "seeker";
  if (input.operatorClerkOrgIds.has(input.orgId)) return "operator";
  return input.orgRole === "org:admin" || input.orgRole === "admin"
    ? "employer_admin"
    : "employer_member";
}
