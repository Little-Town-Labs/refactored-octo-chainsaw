import type { ProductLogSafetyReason, ProductLogSafetyResult } from "../contracts.js";
import { containsDatabaseUrl } from "../db/redaction.js";

const UNSAFE_KEY_PATTERN =
  /(?:secret|token|password|credential|api[_-]?key|raw[_-]?credential|protected[_-]?class|private[_-]?seeker)/i;
const CREDENTIAL_ASSIGNMENT_PATTERN = /(?:secret|token|password|api[_-]?key)=\S+/i;
const PRIVATE_PAYLOAD_PATTERN = /(?:protected_class|private_seeker_content|raw_credential)/i;

export function assertLogSafety(value: unknown): ProductLogSafetyResult {
  const findings: Array<{ path: string; reason: ProductLogSafetyReason }> = [];
  scanValue(value, "$", findings);

  if (findings.length === 0) {
    return { valid: true, reason_code: "safe", forbidden_paths: [] };
  }

  return {
    valid: false,
    reason_code: findings[0]?.reason ?? "private_payload",
    forbidden_paths: findings.map((finding) => finding.path),
  };
}

export function assertSafeMetadata(value: unknown): void {
  const result = assertLogSafety(value);
  if (!result.valid) {
    throw new Error(`Unsafe observability metadata: ${result.reason_code}`);
  }
}

function scanValue(
  value: unknown,
  path: string,
  findings: Array<{ path: string; reason: ProductLogSafetyReason }>,
): void {
  if (typeof value === "string") {
    const reason = unsafeStringReason(value);
    if (reason) findings.push({ path, reason });
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanValue(entry, `${path}[${index}]`, findings));
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const childPath = `${path}.${key}`;
    if (UNSAFE_KEY_PATTERN.test(key)) {
      findings.push({ path: childPath, reason: "unsafe_key" });
      return;
    }
    scanValue(entry, childPath, findings);
  });
}

function unsafeStringReason(value: string): ProductLogSafetyReason | undefined {
  if (containsDatabaseUrl(value)) return "database_url";
  if (CREDENTIAL_ASSIGNMENT_PATTERN.test(value)) return "credential_assignment";
  if (PRIVATE_PAYLOAD_PATTERN.test(value)) return "private_payload";
  return undefined;
}
