// F02 T029/T030 — AAL2 enforcement (FR-11, FR-12, FR-13).
//
// Pure helpers that decide whether a Clerk session satisfies NIST
// SP 800-63B AAL2 and whether a given Spyglass tier requires it.
//
// Per FR-12/13, AAL2 is mandatory (not optional) for every
// non-seeker tier; only seekers may operate at AAL1 (FR-14). The
// proxy.ts middleware applies these helpers after the audience gate.

import type { HumanTier } from "./principal.js";

export type AalLevel = "aal1" | "aal2";

export interface AalSignal {
  /**
   * Clerk's `factorVerificationAge[1]` — seconds since the second
   * factor was verified, or `-1` when no second factor has ever been
   * verified for this session. Required (no default) so callers
   * cannot accidentally pass an undefined value through to a
   * privileged surface.
   */
  readonly secondFactorVerificationAge: number;
  /**
   * Optional max age in seconds. When set, an older verification is
   * downgraded to AAL1 so the session must re-prove the second
   * factor. Step-up reauth scope (M-3) lands in B6; for B3 we leave
   * this off and accept any prior verification.
   */
  readonly maxAgeSeconds?: number;
}

export function evaluateAal(signal: AalSignal): AalLevel {
  if (signal.secondFactorVerificationAge < 0) return "aal1";
  if (
    signal.maxAgeSeconds !== undefined &&
    signal.secondFactorVerificationAge > signal.maxAgeSeconds
  ) {
    return "aal1";
  }
  return "aal2";
}

/**
 * Per FR-11/12/13, every non-seeker tier requires AAL2. Seekers
 * (FR-14) operate at AAL1 by default; per-action step-up may apply
 * but is not enforced at the route-group layer.
 */
export function tierRequiresAal2(tier: HumanTier): boolean {
  return tier !== "seeker";
}

export type AalDecision =
  | { readonly kind: "ok" }
  | { readonly kind: "step_up_required"; readonly tier: HumanTier };

/**
 * Combined decision used by the proxy.ts middleware: returns
 * `step_up_required` when the tier needs AAL2 but the session is
 * still at AAL1. Seekers always return `ok` from this function.
 */
export function evaluateTierAal(tier: HumanTier, signal: AalSignal): AalDecision {
  if (!tierRequiresAal2(tier)) return { kind: "ok" };
  return evaluateAal(signal) === "aal2" ? { kind: "ok" } : { kind: "step_up_required", tier };
}
