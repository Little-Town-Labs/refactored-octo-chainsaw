export const DOSSIER_SCOPES = {
  build: "dossier:build",
  sign: "dossier:sign",
  verify: "dossier:verify",
  review: "dossier:review",
} as const;

export type DossierScope = (typeof DOSSIER_SCOPES)[keyof typeof DOSSIER_SCOPES];

export function hasDossierScope(scopes: readonly string[], scope: DossierScope): boolean {
  return scopes.includes(scope);
}

export function requireDossierScope(scopes: readonly string[], scope: DossierScope): void {
  if (!hasDossierScope(scopes, scope)) throw new Error(`missing dossier scope: ${scope}`);
}
