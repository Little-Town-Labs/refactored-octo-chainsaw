// F02 T056 — Tests for `parseListParams`.

import { parseListParams } from "../parse-search-params.js";

const UUID = "00000000-0000-0000-0000-0000000000aa";

describe("parseListParams", () => {
  it("defaults to status='all' with no other filters", () => {
    expect(parseListParams({})).toEqual({ status: "all" });
  });

  it("accepts status='active' and 'revoked' verbatim", () => {
    expect(parseListParams({ status: "active" }).status).toBe("active");
    expect(parseListParams({ status: "revoked" }).status).toBe("revoked");
  });

  it("falls back to 'all' for unknown status values", () => {
    expect(parseListParams({ status: "expired" }).status).toBe("all");
    expect(parseListParams({ status: "" }).status).toBe("all");
  });

  it("accepts principalId only when it parses as a UUID", () => {
    expect(parseListParams({ principalId: UUID }).principal_id).toBe(UUID);
    expect(parseListParams({ principalId: "not-a-uuid" }).principal_id).toBeUndefined();
    expect(parseListParams({ principalId: "" }).principal_id).toBeUndefined();
  });

  it("passes the cursor through unchanged when within length limit", () => {
    const cursor = "abc123";
    expect(parseListParams({ cursor }).cursor).toBe(cursor);
  });

  it("drops over-long cursors before they hit SQL", () => {
    const huge = "a".repeat(5000);
    expect(parseListParams({ cursor: huge }).cursor).toBeUndefined();
  });

  it("drops empty-string cursors", () => {
    expect(parseListParams({ cursor: "" }).cursor).toBeUndefined();
  });

  it("picks the first value when Next.js gives an array (repeated query param)", () => {
    expect(parseListParams({ status: ["active", "revoked"] }).status).toBe("active");
    expect(parseListParams({ principalId: [UUID, "junk"] }).principal_id).toBe(UUID);
  });
});
