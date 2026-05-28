# Contract: Canary Environment Validation

## `validateProductCanaryEnvironment(env)`

Input:

```ts
Readonly<Record<string, string | undefined>>
```

Output:

```ts
interface ProductCanaryEnvironmentValidation {
  readonly mode: "preview-prod" | "dry-run";
  readonly target_url_label: string;
  readonly missing_env: readonly string[];
  readonly issues: readonly string[];
  readonly required_env: readonly string[];
}
```

Behavior:

- If `PRODUCT_CANARY_DRY_RUN` is `true`, return dry-run mode and do not require preview/prod secrets.
- Otherwise require all preview/prod env values.
- Reject invalid `PRODUCT_CANARY_URL`.
- Return safe target labels derived from URL hostname only.
- Do not return supplied secret values.

## `assertValidProductCanaryEnvironment(env)`

Throws `ProductCanaryEnvironmentError` when `missing_env` or `issues` is non-empty. Error messages contain variable names and issue summaries only.
