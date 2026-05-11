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
 *
 * Each entry must match the Clerk `org_<id>` shape. Malformed entries
 * throw at parse time so a misconfiguration (typo, blank after
 * comma, accidental userId pasted) surfaces immediately at module
 * load rather than at first sign-in (T068/LOW-4).
 */
export class InvalidOperatorClerkOrgIdError extends Error {
  constructor(public readonly value: string) {
    super(
      `Invalid Clerk operator org id: ${JSON.stringify(value)} (expected /^org_[A-Za-z0-9]+$/)`,
    );
    this.name = "InvalidOperatorClerkOrgIdError";
  }
}

const CLERK_ORG_ID_RE = /^org_[A-Za-z0-9]+$/;

export function parseOperatorClerkOrgIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const entry of entries) {
    if (!CLERK_ORG_ID_RE.test(entry)) {
      throw new InvalidOperatorClerkOrgIdError(entry);
    }
  }
  return new Set(entries);
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
