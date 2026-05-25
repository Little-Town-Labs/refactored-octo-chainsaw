import {
  assertNoProhibitedTerms,
  isProhibitedSeekerPath,
  PROHIBITED_SEEKER_PATHS,
} from "../no-dashboard-guard";

describe("F21 no-dashboard guard", () => {
  it("recognizes prohibited seeker web paths", () => {
    for (const path of PROHIBITED_SEEKER_PATHS) {
      expect(isProhibitedSeekerPath(path)).toBe(true);
      expect(isProhibitedSeekerPath(`${path}/`)).toBe(true);
      expect(isProhibitedSeekerPath(path.toUpperCase())).toBe(true);
    }
  });

  it("allows public F21 paths", () => {
    expect(isProhibitedSeekerPath("/")).toBe(false);
    expect(isProhibitedSeekerPath("/sign-up")).toBe(false);
    expect(isProhibitedSeekerPath("/sign-in")).toBe(false);
    expect(isProhibitedSeekerPath("/profile")).toBe(false);
    expect(isProhibitedSeekerPath("/agents.md")).toBe(false);
    expect(isProhibitedSeekerPath("/.well-known/a2a/index.json")).toBe(false);
  });

  it("throws when prohibited product terms appear in public content", () => {
    expect(() => assertNoProhibitedTerms("A calm account setup page.")).not.toThrow();
    expect(() => assertNoProhibitedTerms("Open the ticket list.")).toThrow(
      /Prohibited seeker web terms/,
    );
  });
});
