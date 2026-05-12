// F02 T058 — Tests for `parseRevokeInput`.

import { parseRevokeInput, REASON_CODES } from "../parse-revoke-input";

const VALID_PID = "00000000-0000-0000-0000-00000000a001";

function makeForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("parseRevokeInput", () => {
  it("accepts a valid input", () => {
    const result = parseRevokeInput(
      makeForm({
        principal_id: VALID_PID,
        reason_code: "operator_emergency",
        confirm: "yes",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      principal_id: VALID_PID,
      reason_code: "operator_emergency",
    });
  });

  it("preserves notes when provided", () => {
    const result = parseRevokeInput(
      makeForm({
        principal_id: VALID_PID,
        reason_code: "compromise_suspected",
        notes: "Saw key in CI logs",
        confirm: "yes",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.notes).toBe("Saw key in CI logs");
  });

  it("rejects non-UUID principal_id", () => {
    const result = parseRevokeInput(
      makeForm({ principal_id: "nope", reason_code: "run_cancelled", confirm: "yes" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.principal_id).toBeDefined();
  });

  it("rejects unknown reason_code", () => {
    const result = parseRevokeInput(
      makeForm({ principal_id: VALID_PID, reason_code: "lol", confirm: "yes" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.reason_code).toBeDefined();
  });

  it("rejects submissions without confirm=yes", () => {
    const result = parseRevokeInput(
      makeForm({ principal_id: VALID_PID, reason_code: "run_cancelled" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.confirm).toBeDefined();
  });

  it("rejects notes longer than the 500-char cap", () => {
    const result = parseRevokeInput(
      makeForm({
        principal_id: VALID_PID,
        reason_code: "run_cancelled",
        notes: "x".repeat(501),
        confirm: "yes",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.notes).toBeDefined();
  });

  it("exports REASON_CODES with all four expected values", () => {
    expect(REASON_CODES).toEqual([
      "run_cancelled",
      "compromise_suspected",
      "operator_emergency",
      "scope_violation_detected",
    ]);
  });
});
