export const PROHIBITED_SEEKER_PATHS = [
  "/dashboard",
  "/jobs",
  "/matches",
  "/tickets",
  "/analytics",
  "/recommended-jobs",
  "/seeker/dashboard",
  "/seeker/jobs",
  "/seeker/matches",
  "/seeker/tickets",
  "/seeker/analytics",
  "/seeker/recommended-jobs",
] as const;

export const PROHIBITED_SEEKER_TERMS = [
  "dashboard",
  "ticket list",
  "analytics view",
  "recommended jobs",
  "browse jobs",
  "job grid",
  "public seeker profile",
] as const;

export function isProhibitedSeekerPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return PROHIBITED_SEEKER_PATHS.some((path) => normalized === path);
}

export function assertNoProhibitedTerms(content: string): void {
  const normalized = content.toLowerCase();
  const found = PROHIBITED_SEEKER_TERMS.filter((term) => normalized.includes(term));
  if (found.length > 0) {
    throw new Error(`Prohibited seeker web terms found: ${found.join(", ")}`);
  }
}
