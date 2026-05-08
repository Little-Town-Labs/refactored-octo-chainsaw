// F02 T030/T034 — Composite proxy decision (FR-9, FR-11–13, FR-29).
//
// Stitches the three pure proxy stages together so the Next.js
// middleware just calls one function and reacts to the outcome:
//
//   1. `audienceForPath` — what surface does this path belong to?
//   2. `evaluateAudienceByTier` — does the principal's tier belong?
//   3. `evaluateTierAal` — does the session satisfy AAL2 if needed?
//
// Tests drive this end-to-end without a Next.js runtime, so the
// FR-9 "operator URL returns 404 to non-operators" invariant
// (T034) is a single assertion against this function rather than a
// flaky integration test.

import { evaluateTierAal, type AalSignal } from "../aal.js";
import { type ClerkSessionInput, clerkSessionToTier } from "./clerk-session.js";
import { audienceForPath, evaluateAudienceByTier, type RouteAudience } from "./audience.js";

export type RouteDecision =
  | { readonly kind: "allow" }
  | { readonly kind: "public" } // path is not audience-gated
  | { readonly kind: "not_found" }
  | { readonly kind: "redirect_sign_in"; readonly audience: RouteAudience }
  | { readonly kind: "redirect_step_up"; readonly audience: RouteAudience };

export interface RouteAccessInput {
  readonly pathname: string;
  readonly session: ClerkSessionInput;
  readonly aal: AalSignal;
}

export function decideRouteAccess(input: RouteAccessInput): RouteDecision {
  const audience = audienceForPath(input.pathname);
  if (audience === null) return { kind: "public" };

  const tier = clerkSessionToTier(input.session);
  const audienceDecision = evaluateAudienceByTier(audience, tier);
  if (audienceDecision.kind === "not_found") return { kind: "not_found" };
  if (audienceDecision.kind === "unauthorized") {
    return { kind: "redirect_sign_in", audience };
  }

  // audienceDecision.kind === "allow" implies tier is non-null:
  // - operator audience requires tier === "operator"
  // - employer/seeker audiences route null tier to "unauthorized" above.
  if (tier === null) {
    throw new Error("Internal: audience 'allow' decision with null tier (proxy invariant).");
  }
  const aalDecision = evaluateTierAal(tier, input.aal);
  if (aalDecision.kind === "step_up_required") {
    return { kind: "redirect_step_up", audience };
  }
  return { kind: "allow" };
}
