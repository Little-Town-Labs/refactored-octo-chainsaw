// F02 T060 — Parser tests for the sign-out form.

import { parseSignOutInput } from "../parse-sign-out-input.js";

const VALID_TARGET = "11111111-1111-7111-8111-111111111111";
const VALID_APPROVAL = "22222222-2222-7222-8222-222222222222";

function fd(parts: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(parts)) f.set(k, v);
  return f;
}

describe("parseSignOutInput", () => {
  it("accepts a valid first-call submission (no approval_id)", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "session_compromise",
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        target_principal_id: VALID_TARGET,
        reason_code: "session_compromise",
      });
    }
  });

  it("accepts a second-call submission with approval_id", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "operator_emergency",
        approval_id: VALID_APPROVAL,
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.approval_id).toBe(VALID_APPROVAL);
    }
  });

  it("rejects missing confirm hidden field", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "session_compromise",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.confirm).toBeDefined();
  });

  it("rejects non-UUID target_principal_id", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: "not-a-uuid",
        reason_code: "session_compromise",
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.target_principal_id).toBeDefined();
  });

  it("rejects unknown reason_code", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "run_cancelled", // valid for revoke-credential but not for revoke-all
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.reason_code).toBeDefined();
  });

  it("rejects missing reason_code", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.reason_code).toBeDefined();
  });

  it("rejects non-UUID approval_id when provided", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "session_compromise",
        approval_id: "not-a-uuid",
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.approval_id).toBeDefined();
  });

  it("treats empty approval_id as not-provided", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "session_compromise",
        approval_id: "   ",
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.approval_id).toBeUndefined();
  });

  it("rejects notes exceeding 500 chars", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET,
        reason_code: "session_compromise",
        notes: "x".repeat(501),
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.notes).toBeDefined();
  });

  it("normalizes target_principal_id and approval_id to lowercase", () => {
    const r = parseSignOutInput(
      fd({
        target_principal_id: VALID_TARGET.toUpperCase(),
        reason_code: "compliance_action",
        approval_id: VALID_APPROVAL.toUpperCase(),
        confirm: "yes",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.target_principal_id).toBe(VALID_TARGET);
      expect(r.value.approval_id).toBe(VALID_APPROVAL);
    }
  });
});
