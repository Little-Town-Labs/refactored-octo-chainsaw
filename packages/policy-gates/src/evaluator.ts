import type {
  JurisdictionGateReasonCode,
  JurisdictionGateSubjectKind,
  JurisdictionPolicyRevision,
  PendingGateDecisionRecord,
} from "./types.js";

export interface EvaluateJurisdictionGateInput {
  readonly subject_kind: JurisdictionGateSubjectKind;
  readonly subject_id: string;
  readonly jurisdiction_codes: readonly string[] | null;
  readonly correlation_id: string;
  readonly principal_id: string | null;
}

export interface EvaluateJurisdictionGateOptions {
  readonly policyVersionFallback?: string;
}

export function evaluateJurisdictionGate(
  input: EvaluateJurisdictionGateInput,
  policies: readonly JurisdictionPolicyRevision[],
  options: EvaluateJurisdictionGateOptions = {},
): PendingGateDecisionRecord {
  const jurisdictionCodes = normalizeJurisdictionCodes(input.jurisdiction_codes);
  const reasonCode = decideReason(jurisdictionCodes, policies);
  const matchedPolicies = policies.filter((policy) =>
    jurisdictionCodes.includes(policy.jurisdiction_code),
  );

  return {
    subject_kind: input.subject_kind,
    subject_id: input.subject_id,
    decision: reasonCode === "all_allowed" ? "allow" : "deny",
    reason_code: reasonCode,
    jurisdiction_codes: jurisdictionCodes,
    policy_version:
      matchedPolicies
        .map((policy) => policy.policy_version)
        .sort()
        .join("+") ||
      options.policyVersionFallback ||
      "none",
    policy_revision_ids: matchedPolicies.map((policy) => policy.jurisdiction_policy_id).sort(),
    correlation_id: input.correlation_id,
    principal_id: input.principal_id,
  };
}

function decideReason(
  jurisdictionCodes: readonly string[],
  policies: readonly JurisdictionPolicyRevision[],
): JurisdictionGateReasonCode {
  if (jurisdictionCodes.length === 0) return "missing_jurisdiction";

  const policiesByCode = new Map(policies.map((policy) => [policy.jurisdiction_code, policy]));
  const matchedPolicies = jurisdictionCodes.map((code) => policiesByCode.get(code));

  if (matchedPolicies.some((policy) => policy === undefined)) return "unknown_jurisdiction";
  if (matchedPolicies.some((policy) => policy?.status === "disabled")) {
    return "disabled_jurisdiction";
  }
  if (matchedPolicies.some((policy) => policy?.status === "unsupported")) {
    return "unsupported_jurisdiction";
  }
  if (matchedPolicies.some((policy) => policy?.status === "review_required")) {
    return "review_required";
  }
  if (matchedPolicies.some((policy) => policy?.status === "retired")) return "expired_policy";

  return "all_allowed";
}

function normalizeJurisdictionCodes(
  jurisdictionCodes: readonly string[] | null,
): readonly string[] {
  if (!jurisdictionCodes) return [];
  return [...new Set(jurisdictionCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
}
