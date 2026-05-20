import { randomUUID } from "node:crypto";

import type { PrivacyRepository } from "./repo.js";
import type {
  FilterDecision,
  FilteredProjection,
  JsonObject,
  PrivacyFilterInput,
  PrivacyFilterOutput,
  PrivacyReasonCode,
  PrivacyRulesetVersion,
} from "./types.js";
import {
  chooseDisclosureStage,
  contentHash,
  reviewSafeSummary,
  validateRulesetForFiltering,
} from "./validation.js";

const DEFAULT_REDACTIONS: Array<{ category: string; pattern: RegExp; replacement: string }> = [
  {
    category: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[redacted:email]",
  },
  {
    category: "phone",
    pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[redacted:phone]",
  },
  { category: "url", pattern: /\bhttps?:\/\/[^\s]+/gi, replacement: "[redacted:url]" },
  {
    category: "direct_outreach",
    pattern: /\b(?:call|text|contact me|reach me)\b/gi,
    replacement: "[redacted:direct_outreach]",
  },
  {
    category: "salary_history",
    pattern: /\b(?:current salary|salary history|W-2|paystub|pay stub)\b/gi,
    replacement: "[redacted:salary_history]",
  },
  {
    category: "employer_confidential",
    pattern: /\b(?:internal only|do not disclose|hidden constraint|budget cap|backfill risk)\b/gi,
    replacement: "[redacted:employer_confidential]",
  },
  {
    category: "hidden_scoring",
    pattern: /\b(?:scorecard|hidden score|rank this candidate|negotiating posture)\b/gi,
    replacement: "[redacted:hidden_scoring]",
  },
];

export async function filterForCounterparty(input: {
  readonly repository: PrivacyRepository;
  readonly request: PrivacyFilterInput;
}): Promise<PrivacyFilterOutput> {
  const ruleset = await input.repository.getRuleset(input.request.ruleset_ref);
  const invalidReason = validateRulesetForFiltering(ruleset, input.request.audience);
  if (invalidReason || !ruleset) {
    return appendRefusal(
      input.repository,
      input.request,
      invalidReason ?? "privacy_ruleset_invalid",
      null,
    );
  }
  const stage = chooseDisclosureStage(ruleset, input.request.disclosure_stage);
  if (!stage)
    return appendRefusal(input.repository, input.request, "privacy_ruleset_invalid", ruleset);
  const sourceHash = contentHash(input.request.content);
  const payload = JSON.stringify(input.request.content);
  if (payload.length > ruleset.max_input_chars) {
    return appendRefusal(
      input.repository,
      input.request,
      "privacy_payload_oversized",
      ruleset,
      stage,
      sourceHash,
    );
  }
  const stageAllowed =
    ruleset.disclosure_stages.find((entry) => entry.stage === stage)?.allowed_fields ?? [];
  const allowedFields = new Set([...ruleset.allowed_fields, ...stageAllowed]);
  const output: JsonObject = {};
  const summary: Record<string, number> = {};
  for (const [key, value] of Object.entries(input.request.content)) {
    if (!allowedFields.has(key)) {
      increment(summary, "field_not_allowed");
      continue;
    }
    if (typeof value === "string") {
      output[key] = redactText(value, summary);
    } else if (value == null || typeof value === "number" || typeof value === "boolean") {
      output[key] = value;
    } else {
      output[key] = redactText(JSON.stringify(value), summary);
    }
  }
  if (Object.keys(output).length === 0) {
    return appendRefusal(
      input.repository,
      input.request,
      "privacy_all_content_redacted",
      ruleset,
      stage,
      sourceHash,
      summary,
    );
  }
  const hasRedactions = Object.values(summary).some((value) => value > 0);
  const projection: FilteredProjection = {
    filtered_view_ref: `privacy-filter/${input.request.run_id}/${randomUUID()}`,
    run_id: input.request.run_id,
    audience: input.request.audience,
    disclosure_stage: stage,
    ruleset_ref: { ruleset_id: ruleset.ruleset_id, version: ruleset.version },
    output,
    redaction_summary: reviewSafeSummary(summary),
    created_at: new Date(),
  };
  const decision = await appendDecision(input.repository, {
    request: input.request,
    ruleset,
    stage,
    decision: hasRedactions ? "redact" : "allow",
    reason: hasRedactions ? "privacy_redacted" : "privacy_allowed",
    sourceHash,
    filteredViewRef: projection.filtered_view_ref,
    summary,
  });
  return { decision, projection };
}

function redactText(text: string, summary: Record<string, number>): string {
  let output = text;
  for (const rule of DEFAULT_REDACTIONS) {
    output = output.replace(rule.pattern, () => {
      increment(summary, rule.category);
      return rule.replacement;
    });
  }
  return output;
}

async function appendRefusal(
  repository: PrivacyRepository,
  request: PrivacyFilterInput,
  reason: PrivacyReasonCode,
  ruleset: PrivacyRulesetVersion | null,
  stage = request.disclosure_stage ?? "unavailable",
  sourceHash = contentHash(request.content),
  summary: Record<string, number> = {},
): Promise<PrivacyFilterOutput> {
  const decision = await appendDecision(repository, {
    request,
    ruleset,
    stage,
    decision: "refuse",
    reason,
    sourceHash,
    filteredViewRef: null,
    summary,
  });
  return { decision, projection: null };
}

async function appendDecision(
  repository: PrivacyRepository,
  input: {
    readonly request: PrivacyFilterInput;
    readonly ruleset: PrivacyRulesetVersion | null;
    readonly stage: string;
    readonly decision: "allow" | "redact" | "refuse";
    readonly reason: PrivacyReasonCode;
    readonly sourceHash: string;
    readonly filteredViewRef: string | null;
    readonly summary: Record<string, number>;
  },
): Promise<FilterDecision> {
  return repository.appendFilterDecision({
    filter_decision_id: randomUUID(),
    run_id: input.request.run_id,
    ruleset_id: input.ruleset?.ruleset_id ?? input.request.ruleset_ref.ruleset_id,
    ruleset_version: input.ruleset?.version ?? input.request.ruleset_ref.version,
    audience: input.request.audience,
    disclosure_stage: input.stage,
    decision: input.decision,
    reason_code: input.reason,
    redaction_summary: reviewSafeSummary(input.summary),
    source_content_hash: input.sourceHash,
    filtered_view_ref: input.filteredViewRef,
    audit_event_id: input.request.audit_event_id ?? null,
  });
}

function increment(summary: Record<string, number>, key: string): void {
  summary[key] = (summary[key] ?? 0) + 1;
}
