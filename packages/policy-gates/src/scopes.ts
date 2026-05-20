import { declareScope, hasScope, type Scope } from "@spyglass/auth/scopes";

export const POLICY_READ_SCOPE: Scope = declareScope(
  "policy.read",
  "Read jurisdiction policy posture and bounded decision history.",
);

export const POLICY_DECIDE_SCOPE: Scope = declareScope(
  "policy.decide",
  "Request and persist jurisdiction policy gate decisions.",
);

export const POLICY_KILL_SWITCH_MANAGE_SCOPE: Scope = declareScope(
  "policy.kill_switch.manage",
  "Disable or re-enable jurisdiction posture without deployment.",
);

export const POLICY_GATE_SCOPES: ReadonlyArray<Scope> = [
  POLICY_READ_SCOPE,
  POLICY_DECIDE_SCOPE,
  POLICY_KILL_SWITCH_MANAGE_SCOPE,
];

export interface ScopedPrincipal {
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly scopes: readonly string[];
}

export class PolicyScopeRequiredError extends Error {
  constructor(readonly requiredScope: Scope) {
    super(`Required scope "${requiredScope}" is not granted to the calling principal.`);
    this.name = "PolicyScopeRequiredError";
  }
}

export function requirePolicyScope(principal: ScopedPrincipal, requiredScope: Scope): void {
  if (!hasScope(principal.scopes, requiredScope)) {
    throw new PolicyScopeRequiredError(requiredScope);
  }
}
