export const PRODUCT_CANARY_PREVIEW_PROD_REQUIRED_ENV = [
  "PRODUCT_CANARY_URL",
  "BROWSERBASE_PROJECT_ID",
  "BROWSERBASE_API_KEY",
  "PRODUCT_HARNESS_DATABASE_URL",
  "PRODUCT_ARTIFACT_STORE_PROVIDER",
  "PRODUCT_ARTIFACT_STORE_BUCKET",
  "PRODUCT_ARTIFACT_STORE_PREFIX",
  "PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF",
] as const;

export const PRODUCT_CANARY_DRY_RUN_REQUIRED_ENV = ["PRODUCT_CANARY_DRY_RUN"] as const;

export type ProductCanaryEnvironmentMode = "preview-prod" | "dry-run";

export interface ProductCanaryEnvironmentValidation {
  readonly mode: ProductCanaryEnvironmentMode;
  readonly target_url_label: string;
  readonly missing_env: readonly string[];
  readonly issues: readonly string[];
  readonly required_env: readonly string[];
}

export class ProductCanaryEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductCanaryEnvironmentError";
  }
}

export function validateProductCanaryEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): ProductCanaryEnvironmentValidation {
  if (isTrue(env.PRODUCT_CANARY_DRY_RUN)) {
    return {
      mode: "dry-run",
      target_url_label: "canary:dry-run",
      missing_env: [],
      issues: [],
      required_env: PRODUCT_CANARY_DRY_RUN_REQUIRED_ENV,
    };
  }

  const missing = missingEnv(env, PRODUCT_CANARY_PREVIEW_PROD_REQUIRED_ENV);
  const credentialRef = env.PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF?.trim();
  const credentialEnvName = credentialRef?.startsWith("env:") ? credentialRef.slice(4) : undefined;
  if (credentialEnvName && !envValue(env, credentialEnvName)) {
    missing.push(credentialEnvName);
  }

  const target = validateTargetUrl(env.PRODUCT_CANARY_URL);
  const issues = [
    ...(target.issue ? [target.issue] : []),
    ...(credentialRef && !isSafeCredentialRef(credentialRef)
      ? ["PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF must be an env: reference"]
      : []),
  ];

  return {
    mode: "preview-prod",
    target_url_label: target.label,
    missing_env: uniqueStrings(missing),
    issues,
    required_env: [
      ...PRODUCT_CANARY_PREVIEW_PROD_REQUIRED_ENV,
      ...(credentialEnvName ? [credentialEnvName] : []),
    ],
  };
}

export function assertValidProductCanaryEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): ProductCanaryEnvironmentValidation {
  const validation = validateProductCanaryEnvironment(env);
  if (validation.missing_env.length > 0 || validation.issues.length > 0) {
    const parts = [
      validation.missing_env.length > 0
        ? `missing env: ${validation.missing_env.join(", ")}`
        : undefined,
      validation.issues.length > 0 ? `issues: ${validation.issues.join("; ")}` : undefined,
    ].filter((part): part is string => Boolean(part));
    throw new ProductCanaryEnvironmentError(
      `Invalid product canary environment (${parts.join("; ")})`,
    );
  }
  return validation;
}

export function productCanaryTargetLabel(targetUrl: string | undefined): string {
  return validateTargetUrl(targetUrl).label;
}

function missingEnv(
  env: Readonly<Record<string, string | undefined>>,
  names: readonly string[],
): string[] {
  return names.filter((name) => !envValue(env, name));
}

function envValue(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function validateTargetUrl(value: string | undefined): {
  readonly label: string;
  readonly issue?: string;
} {
  const trimmed = value?.trim();
  if (!trimmed) {
    return {
      label: "canary:missing-target",
      issue: "PRODUCT_CANARY_URL is required for preview/prod canaries",
    };
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return {
        label: "canary:invalid-target",
        issue: "PRODUCT_CANARY_URL must be an absolute http(s) URL",
      };
    }
    return { label: `canary:${url.hostname || "unknown-target"}` };
  } catch {
    return {
      label: "canary:invalid-target",
      issue: "PRODUCT_CANARY_URL must be an absolute http(s) URL",
    };
  }
}

function isSafeCredentialRef(value: string): boolean {
  if (!value.startsWith("env:")) return false;
  return /^env:[A-Z][A-Z0-9_]*$/.test(value);
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}
