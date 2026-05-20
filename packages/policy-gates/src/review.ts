import type { GateDecisionHistoryQuery, JurisdictionPolicyGateRepository } from "./repo.js";
import { POLICY_READ_SCOPE, requirePolicyScope, type ScopedPrincipal } from "./scopes.js";
import type { GateDecisionRecord, JurisdictionPolicyRevision } from "./types.js";

const DEFAULT_DECISION_HISTORY_LIMIT = 50;
const MAX_DECISION_HISTORY_LIMIT = 200;

export interface ReadActivePostureInput {
  readonly principal: ScopedPrincipal;
  readonly jurisdictionCodes: readonly string[];
}

export interface ReadDecisionHistoryInput {
  readonly principal: ScopedPrincipal;
  readonly correlationId?: string;
  readonly subjectKind?: GateDecisionRecord["subject_kind"];
  readonly subjectId?: string;
  readonly jurisdictionCodes?: readonly string[];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export async function readActivePosture(
  repository: JurisdictionPolicyGateRepository,
  input: ReadActivePostureInput,
): Promise<readonly JurisdictionPolicyRevision[]> {
  requirePolicyScope(input.principal, POLICY_READ_SCOPE);
  return repository.getActivePolicies(normalizeJurisdictionCodes(input.jurisdictionCodes));
}

export async function readDecisionHistory(
  repository: JurisdictionPolicyGateRepository,
  input: ReadDecisionHistoryInput,
): Promise<readonly GateDecisionRecord[]> {
  requirePolicyScope(input.principal, POLICY_READ_SCOPE);
  return repository.listGateDecisions(toHistoryQuery(input));
}

function toHistoryQuery(input: ReadDecisionHistoryInput): GateDecisionHistoryQuery {
  return {
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    ...(input.subjectKind ? { subjectKind: input.subjectKind } : {}),
    ...(input.subjectId ? { subjectId: input.subjectId } : {}),
    ...(input.jurisdictionCodes
      ? { jurisdictionCodes: normalizeJurisdictionCodes(input.jurisdictionCodes) }
      : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_DECISION_HISTORY_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) return DEFAULT_DECISION_HISTORY_LIMIT;
  return Math.min(Math.floor(limit), MAX_DECISION_HISTORY_LIMIT);
}

function normalizeJurisdictionCodes(jurisdictionCodes: readonly string[]): readonly string[] {
  return [...new Set(jurisdictionCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
}
