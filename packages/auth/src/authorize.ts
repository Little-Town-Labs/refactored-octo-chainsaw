// F02 T031/T032 — Declarative role and scope guards (FR-27, FR-28, FR-30).
//
// Every privileged action in Spyglass routes through `requireRole`
// (tier-level) or `requireScope` (capability-level). These helpers
// throw typed errors that map to deterministic transport responses;
// they never silently allow access on a missing or malformed claim
// (Constitution §I.6 fail-safe deny).

import { hasScope, type Scope } from "./scopes.js";
import {
  isAgentPrincipal,
  isHumanPrincipal,
  isServicePrincipal,
  type HumanPrincipal,
  type HumanTier,
  type Principal,
} from "./principal.js";

export class RoleRequiredError extends Error {
  constructor(
    public readonly required: ReadonlyArray<HumanTier>,
    public readonly actualKind: Principal["kind"],
    public readonly actualTier?: HumanTier,
  ) {
    super(
      `Role check failed: required one of [${required.join(", ")}], got ` +
        `kind="${actualKind}"${actualTier ? ` tier="${actualTier}"` : ""}.`,
    );
    this.name = "RoleRequiredError";
  }
}

export class ScopeRequiredError extends Error {
  constructor(
    public readonly required: string,
    public readonly grantedScopes: ReadonlyArray<string>,
  ) {
    super(`Scope check failed: required "${required}".`);
    this.name = "ScopeRequiredError";
  }
}

/**
 * Assert that `principal` is a HumanPrincipal whose tier is in
 * `allowed`. Returns a narrowed `HumanPrincipal` so callers can
 * dereference `tier` / `org_id` without re-checking the kind.
 */
export function requireRole(
  principal: Principal,
  ...allowed: ReadonlyArray<HumanTier>
): HumanPrincipal {
  if (!isHumanPrincipal(principal)) {
    throw new RoleRequiredError(allowed, principal.kind);
  }
  if (!allowed.includes(principal.tier)) {
    throw new RoleRequiredError(allowed, principal.kind, principal.tier);
  }
  return principal;
}

/**
 * Read scopes off any principal. HumanPrincipals carry no scope
 * array (their authority comes from tier); we treat them as having
 * an empty granted set so `requireScope` works uniformly across
 * principal kinds. Agent/service principals expose `scopes`
 * directly.
 */
function grantedScopes(principal: Principal): ReadonlyArray<string> {
  if (isAgentPrincipal(principal)) return principal.scopes;
  if (isServicePrincipal(principal)) return principal.scopes;
  return [];
}

/**
 * Assert that `principal` holds `required`. Works on any principal
 * kind; HumanPrincipals always fail the check (use `requireRole`
 * for human authorization).
 */
export function requireScope<P extends Principal>(principal: P, required: Scope | string): P {
  const granted = grantedScopes(principal);
  if (!hasScope(granted, required)) {
    throw new ScopeRequiredError(required, granted);
  }
  return principal;
}
