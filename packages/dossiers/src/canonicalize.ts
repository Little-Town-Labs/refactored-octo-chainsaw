import { createHash } from "node:crypto";

export const DOSSIER_CANONICALIZATION_VERSION = "dossier-c14n-v1";

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function canonicalizeForSigning(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const { signature: _signature, ...rest } = value as Record<string, unknown>;
    void _signature;
    return canonicalize(rest);
  }
  return canonicalize(value);
}

export function contentHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
}

export function signingContentHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalizeForSigning(value)).digest("hex")}`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }
  return value;
}
