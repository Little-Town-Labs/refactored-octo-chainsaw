// F02 T006/T008 — Guard surface (FR-36, FR-37, NFR-11).
//
// `withPrincipal` is the single typed wrapper every Spyglass handler
// — Next.js route, server action, tRPC procedure, Inngest function —
// runs through. The wrapper's signature forces a typed `Principal`
// into the handler's context; calls without one fail closed.
//
// In B2 the resolver is wired to Clerk + materializePrincipal. In B1
// the resolver is an injected interface so unit tests can drive it
// with fake principals. Both the test surface and the production
// surface use the same `withPrincipal`.
//
// Constitution refs: §I.5.2 (zero-trust), §I.6 (fail-safe deny).

import type { Principal } from "./principal.js";

/**
 * Resolves the calling principal for one request.
 *
 * Returning `null` means "no principal could be established" — the
 * guard then rejects with `PrincipalRequiredError`. The resolver MUST
 * NOT throw in the normal "no auth" case; throws are reserved for
 * upstream failures (IdP unreachable) and propagate as 5xx.
 */
export interface PrincipalResolver {
  resolve(): Promise<Principal | null>;
}

export interface PrincipalContext {
  readonly principal: Principal;
}

/**
 * Thrown when a guarded handler is reached without an authenticated
 * principal. Maps to a generic 401 / `UNAUTHORIZED` at the transport
 * boundary; the audit event records the route and any correlation id.
 *
 * Per NFR-13, the message returned to the client is intentionally
 * uninformative; specific reasons go to the audit event only.
 */
export class PrincipalRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "PrincipalRequiredError";
  }
}

/**
 * Marker error for routes that *intentionally* permit anonymous
 * access (FR-36). A handler that wants to opt out of `withPrincipal`
 * does so by being declared via a separate `withAnonymous(...)`
 * helper that throws this on misuse — never by silently bypassing
 * `withPrincipal`.
 *
 * Currently a no-op marker shape; the production helper lands in B2
 * once concrete anonymous routes (sign-in pages) are needed.
 */
export class AnonymousAccessError extends Error {
  constructor(route: string) {
    super(
      `Route "${route}" is intended to permit anonymous access; ` +
        `wrap it with withAnonymous(...) instead of withPrincipal(...).`,
    );
    this.name = "AnonymousAccessError";
  }
}

/**
 * Wrap a handler so it can be invoked only with a typed Principal in
 * its context. The returned function takes the resolver as its first
 * argument so production wiring (Next.js middleware, tRPC context
 * builder) can inject the real Clerk-backed resolver while tests
 * inject fakes.
 */
export function withPrincipal<TPayload, TResult>(
  handler: (ctx: PrincipalContext, payload: TPayload) => Promise<TResult>,
): (resolver: PrincipalResolver, payload: TPayload) => Promise<TResult> {
  return async (resolver, payload) => {
    const principal = await resolver.resolve();
    if (principal === null) {
      throw new PrincipalRequiredError();
    }
    return handler({ principal }, payload);
  };
}

/**
 * Synchronous accessor placeholder. The production version uses
 * AsyncLocalStorage / `React.cache()` to memoize the principal per
 * request. B2 wires the real implementation; B1 ships the contract
 * shape so consumers compile against a stable signature.
 */
export function getPrincipal(): Principal {
  throw new Error(
    "getPrincipal() is not callable in B1 — wire the request-scoped " +
      "resolver in B2 (proxy.ts) before depending on this helper.",
  );
}
