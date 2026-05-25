import { handleControl } from "./controls.js";
import { handleDemographicConsent } from "./demographics.js";
import { handleDossierReview, isForbiddenDataRequest } from "./dossier-review.js";
import { buildConversationIdempotencyKey } from "./idempotency.js";
import { handleOnboarding, handleOnboardingRefusal } from "./onboarding.js";
import { isAuthorizedEvent } from "./policy.js";
import type { SeekerFlowRepositories } from "./repo.js";
import type { FlowResult, SeekerConversationEvent } from "./types.js";

export interface FlowOrchestratorOptions {
  readonly counselApprovedDemographics?: boolean;
  readonly demographicJurisdictionEnabled?: boolean;
}

export const handleSeekerConversationEvent = (
  event: SeekerConversationEvent,
  repos: SeekerFlowRepositories,
  options: FlowOrchestratorOptions = {},
): FlowResult => {
  const idempotencyKey = buildConversationIdempotencyKey(event);
  if (!repos.claimIdempotency(idempotencyKey)) {
    return handleOnboardingRefusal(event, "duplicate_event");
  }
  if (!isAuthorizedEvent(event)) {
    return handleOnboardingRefusal(event, "unauthorized_channel");
  }
  if (isDashboardLikeIntent(event.text ?? "")) {
    return handleOnboardingRefusal(event, "dashboard_intent_refused");
  }
  if (isForbiddenDataRequest(event.text ?? "")) {
    return handleOnboardingRefusal(event, "hidden_or_raw_data_refused");
  }

  if (event.flowFamily === "onboarding") {
    return handleOnboarding(event, repos);
  }
  if (event.flowFamily === "dossier-review") {
    return handleDossierReview(event, repos);
  }
  if (event.flowFamily === "controls") {
    return handleControl(event, repos);
  }
  if (event.flowFamily === "demographic-consent") {
    return handleDemographicConsent(event, repos, {
      counselApproved: options.counselApprovedDemographics ?? false,
      jurisdictionEnabled: options.demographicJurisdictionEnabled ?? false,
    });
  }
  return handleOnboardingRefusal(event, "unsupported_flow_family");
};

export const isDashboardLikeIntent = (text: string): boolean =>
  /dashboard|ticket list|analytics|recommended jobs|browse jobs|all jobs/i.test(text);
