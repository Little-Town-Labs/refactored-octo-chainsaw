// F02 T004 — Scope registry contract (test-first).
//
// Per spec FR-30/31/32 and Constitution §I.5.2 (least privilege),
// scopes are declarative and additive. Feature packages declare the
// scopes they require; F02 does not need to change to add a scope.

import {
  declareScope,
  hasScope,
  isKnownScope,
  listScopes,
  __resetScopeRegistryForTests,
  ScopeAlreadyDeclaredError,
  type Scope,
} from "../scopes.js";

describe("scope registry (FR-30, FR-31, FR-32)", () => {
  beforeEach(() => __resetScopeRegistryForTests());

  it("declared scopes are listed and recognized", () => {
    declareScope("dossier.view", "Read dossiers within the operator's tenant scope.");
    expect(isKnownScope("dossier.view")).toBe(true);
    expect(listScopes()).toContain("dossier.view");
  });

  it("unknown scopes are rejected by isKnownScope", () => {
    expect(isKnownScope("does.not.exist")).toBe(false);
  });

  it("hasScope returns true only when the granted set covers the required scope", () => {
    declareScope("a.b", "");
    declareScope("a.c", "");
    expect(hasScope(["a.b", "a.c"], "a.b")).toBe(true);
    expect(hasScope(["a.b"], "a.c")).toBe(false);
  });

  it("redeclaring the same scope name throws (additive registry — no silent override)", () => {
    declareScope("audit.read", "first");
    expect(() => declareScope("audit.read", "second")).toThrow(ScopeAlreadyDeclaredError);
  });

  it("scope names follow `domain.action` lowercase shape", () => {
    expect(() => declareScope("Bad-Name", "")).toThrow();
    expect(() => declareScope("UPPER", "")).toThrow();
    expect(() => declareScope("", "")).toThrow();
    declareScope("ok.lowercase_action", "");
  });

  it("Scope is a branded string type — unknown literal cannot satisfy it", () => {
    declareScope("only.this", "");
    const s: Scope = "only.this" as Scope;
    expect(s).toBe("only.this");
  });
});
