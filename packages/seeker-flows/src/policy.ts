import type {
  DemographicConsentPosture,
  MatchNotificationEvent,
  SeekerConversationEvent,
  SeekerTicketProductState,
} from "./types.js";

export const isAuthorizedEvent = (event: SeekerConversationEvent): boolean =>
  event.channelPosture.verified &&
  event.channelPosture.authorized &&
  !event.channelPosture.disabled;

export const canReceiveProductAction = (state?: SeekerTicketProductState): boolean =>
  state !== undefined && !["withdrawn", "closed", "hired"].includes(state.state);

export const canNotifyMatch = (
  state: SeekerTicketProductState | undefined,
  event: MatchNotificationEvent,
): boolean =>
  state?.state === "active" &&
  !event.stale &&
  !event.jurisdictionBlocked &&
  event.approvedProjectionRef !== undefined &&
  event.approvedProjectionRef.trim().length > 0;

export const isDemographicCollectionEnabled = (posture: DemographicConsentPosture): boolean =>
  posture.consentState === "consented" &&
  posture.collectionEnabled &&
  posture.consentVersion !== undefined &&
  posture.jurisdictionPosture === "enabled" &&
  posture.segregatedDataRef !== undefined;
