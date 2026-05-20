import { closingSentinel, validateUntrustedEnvelope, wrapUntrustedText } from "../sentinel.js";
import type { PrivacyInputClass } from "../types.js";

describe("untrusted input sentinels", () => {
  it.each([
    "seeker_resume",
    "employer_req",
    "ats_import",
    "tool_returned",
    "a2a_received",
  ] as const)("wraps and validates %s payloads", (inputClass: PrivacyInputClass) => {
    const envelope = wrapUntrustedText({
      run_id: "run-sentinel",
      nonce: "nonce-123",
      input_class: inputClass,
      source_ref: `source:${inputClass}`,
      text: "untrusted text",
    });
    expect(validateUntrustedEnvelope(envelope)).toEqual({ ok: true, text: "untrusted text" });
  });

  it("fails closed for forged, missing, duplicated, and mismatched sentinels", () => {
    const envelope = wrapUntrustedText({
      run_id: "run-sentinel",
      nonce: "nonce-123",
      input_class: "seeker_resume",
      source_ref: "source",
      text: "untrusted text",
    });
    expect(() =>
      wrapUntrustedText({
        run_id: "run-sentinel",
        nonce: "nonce-123",
        input_class: "seeker_resume",
        source_ref: "source",
        text: closingSentinel("run-sentinel", "nonce-123", "seeker_resume"),
      }),
    ).toThrow("sentinel_injection_detected");
    expect(validateUntrustedEnvelope({ ...envelope, wrapped_text: "missing" })).toEqual({
      ok: false,
      reason_code: "sentinel_missing",
    });
    expect(validateUntrustedEnvelope({ ...envelope, nonce: "other-nonce" })).toEqual({
      ok: false,
      reason_code: "sentinel_missing",
    });
    expect(
      validateUntrustedEnvelope({
        ...envelope,
        wrapped_text: `${envelope.wrapped_text}\n${closingSentinel("run-sentinel", "nonce-123", "seeker_resume")}`,
      }),
    ).toEqual({ ok: false, reason_code: "sentinel_duplicate" });
  });
});
