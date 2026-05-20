import { declareScope, hasScope, type Scope } from "@spyglass/auth/scopes";

export const RUBRIC_READ_SCOPE: Scope = declareScope(
  "rubric.read",
  "Read rubric versions, bias-test artifacts, and bounded gate history.",
);

export const RUBRIC_PUBLISH_SCOPE: Scope = declareScope(
  "rubric.publish",
  "Publish reviewed immutable rubric versions.",
);

export const RUBRIC_DEPRECATE_SCOPE: Scope = declareScope(
  "rubric.deprecate",
  "Deprecate rubric versions for new dispatch.",
);

export const BIAS_TEST_REGISTER_SCOPE: Scope = declareScope(
  "bias_test.register",
  "Register reviewed bias-test artifacts for rubric versions.",
);

export const RUBRIC_SCOPES: ReadonlyArray<Scope> = [
  RUBRIC_READ_SCOPE,
  RUBRIC_PUBLISH_SCOPE,
  RUBRIC_DEPRECATE_SCOPE,
  BIAS_TEST_REGISTER_SCOPE,
];

export interface ScopedPrincipal {
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly scopes: readonly string[];
}

export class RubricScopeRequiredError extends Error {
  constructor(readonly requiredScope: Scope) {
    super(`Required scope "${requiredScope}" is not granted to the calling principal.`);
    this.name = "RubricScopeRequiredError";
  }
}

export function requireRubricScope(principal: ScopedPrincipal, requiredScope: Scope): void {
  if (!hasScope(principal.scopes, requiredScope)) {
    throw new RubricScopeRequiredError(requiredScope);
  }
}
