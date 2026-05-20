import { declareScope, hasScope, type Scope } from "@spyglass/auth/scopes";

export const CONTRACT_READ_SCOPE: Scope = declareScope(
  "contract.read",
  "Read agent contract versions and bounded publication history.",
);

export const CONTRACT_PUBLISH_SCOPE: Scope = declareScope(
  "contract.publish",
  "Publish reviewed immutable agent contract versions.",
);

export const CONTRACT_DEPRECATE_SCOPE: Scope = declareScope(
  "contract.deprecate",
  "Deprecate agent contract versions for new dispatch.",
);

export const AGENT_CONTRACT_SCOPES: ReadonlyArray<Scope> = [
  CONTRACT_READ_SCOPE,
  CONTRACT_PUBLISH_SCOPE,
  CONTRACT_DEPRECATE_SCOPE,
];

export interface ScopedPrincipal {
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly scopes: readonly string[];
}

export class ContractScopeRequiredError extends Error {
  constructor(readonly requiredScope: Scope) {
    super(`Required scope "${requiredScope}" is not granted to the calling principal.`);
    this.name = "ContractScopeRequiredError";
  }
}

export function requireContractScope(principal: ScopedPrincipal, requiredScope: Scope): void {
  if (!hasScope(principal.scopes, requiredScope)) {
    throw new ContractScopeRequiredError(requiredScope);
  }
}
