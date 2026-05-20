import { canonicalize, signingContentHash } from "../canonicalize.js";

describe("dossier canonicalization", () => {
  it("is stable under object key reordering", () => {
    expect(canonicalize({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalize({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  it("excludes only the top-level signature object from signing hash", () => {
    const base = { dossier_id: "d1", payload: { signature: "nested" }, signature: null };
    const signed = { ...base, signature: { signature: "abc" } };
    expect(signingContentHash(base)).toBe(signingContentHash(signed));
    expect(signingContentHash(base)).not.toBe(
      signingContentHash({ ...base, payload: { signature: "changed" } }),
    );
  });
});
