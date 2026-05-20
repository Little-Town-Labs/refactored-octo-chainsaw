export const PRIVACY_FILTER_SCOPES = {
  publish: "privacy_filter:publish",
  deprecate: "privacy_filter:deprecate",
  review: "privacy_filter:review",
} as const;

export type PrivacyFilterScope = (typeof PRIVACY_FILTER_SCOPES)[keyof typeof PRIVACY_FILTER_SCOPES];

export function hasPrivacyScope(scopes: readonly string[], scope: PrivacyFilterScope): boolean {
  return scopes.includes(scope);
}

export function requirePrivacyScope(scopes: readonly string[], scope: PrivacyFilterScope): void {
  if (!hasPrivacyScope(scopes, scope)) {
    throw new Error(`missing privacy-filter scope: ${scope}`);
  }
}
