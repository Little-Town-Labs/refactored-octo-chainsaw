import type { PrivacyRepository } from "./repo.js";
import { PRIVACY_FILTER_SCOPES, requirePrivacyScope } from "./scopes.js";
import type {
  CounterpartyAccessFinding,
  FilterDecision,
  PrivacyPrincipal,
  PrivacyRulesetVersion,
  SentinelFailure,
} from "./types.js";

export interface PrivacyReviewBundle {
  readonly rulesets: readonly PrivacyRulesetVersion[];
  readonly decisions: readonly FilterDecision[];
  readonly sentinel_failures: readonly SentinelFailure[];
  readonly access_findings: readonly CounterpartyAccessFinding[];
}

export async function readPrivacyReviewBundle(input: {
  readonly repository: PrivacyRepository;
  readonly principal: PrivacyPrincipal;
  readonly run_id?: string;
}): Promise<PrivacyReviewBundle> {
  requirePrivacyScope(input.principal.scopes, PRIVACY_FILTER_SCOPES.review);
  return {
    rulesets: await input.repository.listRulesets(),
    decisions: await input.repository.listFilterDecisions(input.run_id),
    sentinel_failures: await input.repository.listSentinelFailures(input.run_id),
    access_findings: await input.repository.listAccessFindings(),
  };
}
