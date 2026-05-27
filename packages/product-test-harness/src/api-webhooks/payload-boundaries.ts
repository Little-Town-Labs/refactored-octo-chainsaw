import type { SafeMetadata, WebhookPayloadBoundaryResult } from "../contracts.js";

const FORBIDDEN_FIELD_NAMES = new Set([
  "api_key",
  "credential",
  "date_of_birth",
  "password",
  "protected_class",
  "raw_credential",
  "seeker_private_notes",
  "secret",
  "ssn",
  "token",
]);

export function assertWebhookPayloadBoundary(payload: SafeMetadata): WebhookPayloadBoundaryResult {
  const forbiddenPaths: string[] = [];
  inspectPayload(payload, "$", forbiddenPaths);
  return {
    valid: forbiddenPaths.length === 0,
    forbidden_paths: forbiddenPaths,
  };
}

function inspectPayload(value: unknown, path: string, forbiddenPaths: string[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectPayload(entry, `${path}[${index}]`, forbiddenPaths));
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_FIELD_NAMES.has(key.toLowerCase())) forbiddenPaths.push(childPath);
    inspectPayload(entry, childPath, forbiddenPaths);
  });
}
