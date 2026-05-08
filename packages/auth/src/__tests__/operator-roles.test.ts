// F02 T033 — Operator role registry tests (FR-32).

import { isKnownScope, listScopes } from "../scopes.js";
// Import for side effect: registers the operator scopes.
import {
  OPERATOR_CREDENTIAL_ISSUER,
  OPERATOR_DOSSIER_VIEWER,
  OPERATOR_POLICY_GATE,
  OPERATOR_SCOPES,
} from "../operator-roles.js";

describe("operator role registry", () => {
  it("declares the three FR-32 operator scopes", () => {
    expect(isKnownScope(OPERATOR_DOSSIER_VIEWER)).toBe(true);
    expect(isKnownScope(OPERATOR_POLICY_GATE)).toBe(true);
    expect(isKnownScope(OPERATOR_CREDENTIAL_ISSUER)).toBe(true);
  });

  it("OPERATOR_SCOPES enumerates exactly those three", () => {
    expect(OPERATOR_SCOPES).toHaveLength(3);
  });

  it("each scope name follows the registry pattern", () => {
    const all = listScopes();
    for (const op of OPERATOR_SCOPES) {
      expect(all).toContain(op as string);
    }
  });
});
