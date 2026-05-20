import { createHash } from "node:crypto";

import {
  PRIVACY_AUDIENCES,
  PRIVACY_INPUT_CLASSES,
  type JsonObject,
  type PrivacyAudience,
  type PrivacyInputClass,
  type PrivacyReasonCode,
  type PrivacyRulesetVersion,
} from "./types.js";

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function contentHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function assertPrivacyAudience(value: string): asserts value is PrivacyAudience {
  if (!PRIVACY_AUDIENCES.includes(value as PrivacyAudience)) {
    throw new Error(`unsupported privacy audience: ${value}`);
  }
}

export function assertPrivacyInputClass(value: string): asserts value is PrivacyInputClass {
  if (!PRIVACY_INPUT_CLASSES.includes(value as PrivacyInputClass)) {
    throw new Error(`unsupported privacy input class: ${value}`);
  }
}

export function validateRulesetForFiltering(
  ruleset: PrivacyRulesetVersion | null,
  audience: PrivacyAudience,
): PrivacyReasonCode | null {
  if (!ruleset) return "privacy_ruleset_missing";
  if (ruleset.status !== "published") return "privacy_ruleset_unpublished";
  if (ruleset.audience !== audience) return "privacy_ruleset_invalid";
  if (ruleset.disclosure_stages.length === 0) return "privacy_ruleset_invalid";
  if (ruleset.max_input_chars <= 0) return "privacy_ruleset_invalid";
  return null;
}

export function chooseDisclosureStage(
  ruleset: PrivacyRulesetVersion,
  requestedStage?: string,
): string | null {
  if (requestedStage) {
    return ruleset.disclosure_stages.some((stage) => stage.stage === requestedStage)
      ? requestedStage
      : null;
  }
  const [first] = [...ruleset.disclosure_stages].sort((a, b) => a.order - b.order);
  return first?.stage ?? null;
}

export function reviewSafeSummary(
  summary: Readonly<Record<string, number>>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(summary).filter((entry): entry is [string, number] =>
      Number.isInteger(entry[1]),
    ),
  );
}

export function jsonObjectFromText(text: string): JsonObject {
  return { text };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }
  return value;
}
