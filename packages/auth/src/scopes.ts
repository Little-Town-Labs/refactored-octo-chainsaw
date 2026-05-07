// F02 T005 — Scope registry (FR-30, FR-31, FR-32).
//
// Scopes are declared at module load time by feature packages. The
// registry is additive — once declared, a scope cannot be redeclared
// (no silent override). Adding a new scope requires no changes inside
// `@spyglass/auth` itself, satisfying FR-31.
//
// Authorization decisions consult `hasScope(grantedScopes, required)`
// from the `@spyglass/auth` guard surface. Feature packages never
// implement scope checks ad-hoc (FR-27).

/** Branded string type for declared scope names. */
export type Scope = string & { readonly __brand: unique symbol };

interface ScopeEntry {
  readonly name: string;
  readonly description: string;
}

const registry = new Map<string, ScopeEntry>();

const SCOPE_NAME_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

export class ScopeAlreadyDeclaredError extends Error {
  constructor(name: string) {
    super(`Scope "${name}" is already declared. Scopes are additive; pick a distinct name.`);
    this.name = "ScopeAlreadyDeclaredError";
  }
}

export class InvalidScopeNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid scope name "${name}". Scopes must match /^[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)+$/ ` +
        `(e.g. "dossier.view", "credentials.issue_agent").`,
    );
    this.name = "InvalidScopeNameError";
  }
}

/**
 * Declare a scope. Called at module load time by the feature package
 * that owns it. Throws if the name is malformed or already declared.
 */
export function declareScope(name: string, description: string): Scope {
  if (!SCOPE_NAME_PATTERN.test(name)) {
    throw new InvalidScopeNameError(name);
  }
  if (registry.has(name)) {
    throw new ScopeAlreadyDeclaredError(name);
  }
  registry.set(name, { name, description });
  return name as Scope;
}

/** Whether `name` is a registered scope. */
export function isKnownScope(name: string): boolean {
  return registry.has(name);
}

/** Sorted list of declared scope names (deterministic for snapshot tests). */
export function listScopes(): ReadonlyArray<string> {
  return [...registry.keys()].sort();
}

/**
 * Returns true iff `granted` includes `required`. No wildcard semantics
 * in v0 — a granted scope must exactly match the required scope. Future
 * hierarchy (`dossier.*`) is intentionally deferred.
 */
export function hasScope(granted: ReadonlyArray<string>, required: string): boolean {
  return granted.includes(required);
}

/** Test-only: clear the registry between cases. Not exported from index. */
export function __resetScopeRegistryForTests(): void {
  registry.clear();
}
