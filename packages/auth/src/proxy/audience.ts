// F02 T018 — Audience gate (FR-9, FR-29, FR-36).
//
// Pure function that decides whether a principal may enter a route
// group. Extracted from the Next.js middleware so the policy is unit-
// testable without spinning up the request pipeline.
//
// Per FR-9 the operator surface is *hidden*: requests by anyone other
// than an operator return 404 (not 401), so the URL space leaks no
// signal about its existence. The seeker and employer surfaces use
// 401 for unauthenticated callers (sign-in redirect) and 404 for
// principals from a different audience.

import { isHumanPrincipal, type HumanTier, type Principal } from "../principal.js";

export type RouteAudience = "seeker" | "employer" | "operator";

export type AudienceDecision =
  | { readonly kind: "allow" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "not_found" };

const ALLOW: AudienceDecision = { kind: "allow" };
const UNAUTHORIZED: AudienceDecision = { kind: "unauthorized" };
const NOT_FOUND: AudienceDecision = { kind: "not_found" };

/**
 * Decide whether `principal` may enter a request scoped to `audience`.
 *
 * Operator surface (FR-9) is hidden — every non-operator outcome maps
 * to 404. For seeker/employer surfaces the unauthenticated case maps
 * to 401 (so the framework can redirect to Clerk sign-in), while
 * authenticated-but-wrong-tier maps to 404 (don't leak which tiers
 * exist).
 */
export function evaluateAudience(
  audience: RouteAudience,
  principal: Principal | null,
): AudienceDecision {
  if (principal === null) {
    // Operator surface is hidden — null prefers 404 over 401.
    return audience === "operator" ? NOT_FOUND : UNAUTHORIZED;
  }
  if (!isHumanPrincipal(principal)) return NOT_FOUND;
  return evaluateAudienceByTier(audience, principal.tier);
}

/**
 * Tier-only variant used by the Next.js middleware, which decides
 * audience membership from the Clerk session before any database
 * round-trip (full materialization happens lazily at the request
 * handler). Semantics match `evaluateAudience` for human principals.
 */
export function evaluateAudienceByTier(
  audience: RouteAudience,
  tier: HumanTier | null,
): AudienceDecision {
  if (audience === "operator") {
    return tier === "operator" ? ALLOW : NOT_FOUND;
  }
  if (tier === null) return UNAUTHORIZED;
  if (audience === "seeker") return tier === "seeker" ? ALLOW : NOT_FOUND;
  return tier === "employer_admin" || tier === "employer_member" ? ALLOW : NOT_FOUND;
}

/**
 * Map a Next.js pathname to its route-group audience, or `null` for
 * paths that don't belong to any audience-gated group (public routes,
 * webhooks, the catch-all sign-in surfaces).
 */
export function audienceForPath(pathname: string): RouteAudience | null {
  if (pathname.startsWith("/operator")) return "operator";
  if (pathname.startsWith("/employer")) return "employer";
  if (pathname.startsWith("/seeker")) return "seeker";
  return null;
}
