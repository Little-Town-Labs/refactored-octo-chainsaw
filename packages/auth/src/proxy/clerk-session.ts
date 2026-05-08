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
//   - unknown orgRole on a non-operator org -> null (fail-safe deny)
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

const ADMIN_ROLES = new Set(["org:admin", "admin"]);
const MEMBER_ROLES = new Set(["org:member", "member"]);

/**
 * Parse a comma-separated list of Clerk org IDs from an env var into
 * the set the proxy and lazy materializer both consume. Empty / null
 * yields an empty set; whitespace-only entries are dropped.
 */
export function parseOperatorClerkOrgIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

export function clerkSessionToTier(input: ClerkSessionInput): HumanTier | null {
  if (input.userId === null) return null;
  if (input.orgId === null) return "seeker";
  if (input.operatorClerkOrgIds.has(input.orgId)) return "operator";
  if (input.orgRole === null) return null;
  if (ADMIN_ROLES.has(input.orgRole)) return "employer_admin";
  if (MEMBER_ROLES.has(input.orgRole)) return "employer_member";
  // Unknown role — fail-safe deny (Constitution §I.6).
  return null;
}
