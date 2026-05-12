"use client";

// F02 T032 — `<RequireScope>` cosmetic client component (FR-27, FR-28).
//
// COSMETIC ONLY. This component hides UI affordances when the
// current client principal lacks a scope. It is NOT a security
// boundary — server-side `requireRole` / `requireScope` is what
// actually enforces authorization (Constitution §I.6 fail-safe
// deny). A user who tampers with the client to render the hidden
// branch will still hit a `ScopeRequiredError` on submission.
//
// Client principal projection (per NFR-7) only carries
// `{ principal_id, kind, tier }`; we don't ship granular scopes to
// the browser. So this component currently gates on TIER (the
// derived authority of an operator role). The richer scope-set
// projection lands when the operator console (B6) needs it.

import type { ReactNode } from "react";

import { usePrincipal, type ClientPrincipal } from "./principal-context";

interface RequireScopeProps {
  /**
   * The minimum operator capability needed. Maps to a tier today;
   * the operator console (B6) extends this to a real scope set.
   */
  readonly anyOf: ReadonlyArray<ClientPrincipal["tier"]>;
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

export function RequireScope({ anyOf, children, fallback = null }: RequireScopeProps) {
  const principal = usePrincipal();
  return anyOf.includes(principal.tier) ? <>{children}</> : <>{fallback}</>;
}
