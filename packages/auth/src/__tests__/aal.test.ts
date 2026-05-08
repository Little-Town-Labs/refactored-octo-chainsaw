// F02 T029 — AAL2 evaluation tests (FR-11, FR-12, FR-13, FR-14).

import { evaluateAal, evaluateTierAal, tierRequiresAal2 } from "../aal.js";
import type { HumanTier } from "../principal.js";

describe("evaluateAal", () => {
  it("returns 'aal1' when no second factor has been verified (age -1)", () => {
    expect(evaluateAal({ secondFactorVerificationAge: -1 })).toBe("aal1");
  });

  it("returns 'aal2' for any non-negative verification age", () => {
    expect(evaluateAal({ secondFactorVerificationAge: 0 })).toBe("aal2");
    expect(evaluateAal({ secondFactorVerificationAge: 60 })).toBe("aal2");
    expect(evaluateAal({ secondFactorVerificationAge: 86_400 })).toBe("aal2");
  });

  it("downgrades to 'aal1' when the verification age exceeds maxAgeSeconds", () => {
    expect(evaluateAal({ secondFactorVerificationAge: 1_000, maxAgeSeconds: 500 })).toBe("aal1");
    expect(evaluateAal({ secondFactorVerificationAge: 100, maxAgeSeconds: 500 })).toBe("aal2");
  });
});

describe("tierRequiresAal2 (FR-11/12/13/14)", () => {
  it.each<HumanTier>(["operator", "employer_admin", "employer_member"])(
    "tier '%s' requires AAL2",
    (tier) => {
      expect(tierRequiresAal2(tier)).toBe(true);
    },
  );

  it("seekers do not require AAL2 (FR-14)", () => {
    expect(tierRequiresAal2("seeker")).toBe(false);
  });
});

describe("evaluateTierAal", () => {
  it("returns 'ok' for seekers regardless of AAL", () => {
    expect(evaluateTierAal("seeker", { secondFactorVerificationAge: -1 }).kind).toBe("ok");
  });

  it("returns 'step_up_required' for operator at AAL1", () => {
    const decision = evaluateTierAal("operator", { secondFactorVerificationAge: -1 });
    expect(decision).toEqual({ kind: "step_up_required", tier: "operator" });
  });

  it("returns 'ok' for employer_admin at AAL2", () => {
    expect(evaluateTierAal("employer_admin", { secondFactorVerificationAge: 60 }).kind).toBe("ok");
  });

  it("returns 'step_up_required' for employer_member when AAL2 is missing", () => {
    expect(evaluateTierAal("employer_member", { secondFactorVerificationAge: -1 }).kind).toBe(
      "step_up_required",
    );
  });
});
