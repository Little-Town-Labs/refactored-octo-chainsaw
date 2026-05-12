// F02 — `withAnonymous` marker (FR-36 explicit-not-implicit).
//
// A small wrapper that flags a route handler as intentionally
// anonymous. The wrapper currently has no runtime behavior — its
// presence is what the CI principal-coverage gate (T011a) uses to
// distinguish "deliberately permits anonymous access" from
// "forgot to call withPrincipal".
//
// Use this only for surfaces whose authentication is established
// outside Spyglass's principal-resolution path:
//
//   - Clerk webhook ingress (Svix signature is the authentication).
//   - Public health / readiness probes.
//   - Static catch-all sign-in / sign-up pages (Clerk-hosted UI).
//
// Anything that mutates Spyglass state on behalf of a user must use
// `withPrincipal` from `@spyglass/auth` instead.

export interface AnonymousRouteOptions {
  readonly route: string;
  readonly reason?: string;
}

/**
 * Wrap a Next.js route handler as anonymous-by-design. The wrapper
 * is the identity function at runtime; its purpose is to import
 * `withAnonymous` into the file so the CI gate sees the marker.
 */
export function withAnonymous<TFn extends (...args: never[]) => Promise<Response> | Response>(
  fn: TFn,
  _options: AnonymousRouteOptions,
): TFn {
  return fn;
}
