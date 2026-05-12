// F02 T059 — Tests for the audit searchParams parser.

import { parseAuditParams } from "../parse-audit-search-params";

describe("parseAuditParams", () => {
  it("returns empty when no params supplied", () => {
    expect(parseAuditParams({})).toEqual({});
  });

  it("accepts a valid UUID principalId", () => {
    const pid = "11111111-1111-1111-1111-111111111111";
    expect(parseAuditParams({ principalId: pid })).toEqual({ principal_id: pid });
  });

  it("drops a non-UUID principalId silently", () => {
    expect(parseAuditParams({ principalId: "not-a-uuid" })).toEqual({});
  });

  it("drops an over-long cursor", () => {
    const tooLong = "a".repeat(5000);
    expect(parseAuditParams({ cursor: tooLong })).toEqual({});
  });

  it("preserves a short cursor unchanged (opaque passthrough)", () => {
    expect(parseAuditParams({ cursor: "eyJ0cyI6IjEifQ" })).toEqual({ cursor: "eyJ0cyI6IjEifQ" });
  });

  it("uses the first value when an array is supplied", () => {
    const pid = "11111111-1111-1111-1111-111111111111";
    expect(parseAuditParams({ principalId: [pid, "ignored"] })).toEqual({ principal_id: pid });
  });
});
