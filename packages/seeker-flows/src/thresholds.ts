import type { PreferenceThresholdPosture, SeekerConversationEvent } from "./types.js";

export const buildThresholdPosture = (
  event: SeekerConversationEvent,
): PreferenceThresholdPosture | undefined => {
  const text = event.text ?? "";
  const thresholdMatch = /threshold=([0-9]+(?:\.[0-9]+)?)/i.exec(text);
  if (!thresholdMatch?.[1]) {
    return undefined;
  }
  const threshold = Number(thresholdMatch[1]);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    return undefined;
  }
  return {
    postureId: `threshold:${event.seekerId}`,
    seekerId: event.seekerId,
    thresholds: { match: threshold },
    preferences: parsePreferences(text),
    validationVersion: "f20.v1",
    effectiveAt: event.receivedAt,
  };
};

const parsePreferences = (text: string): Readonly<Record<string, string>> => {
  const preferences: Record<string, string> = {};
  const preferenceMatch = /pref=([^;]+)/i.exec(text);
  if (preferenceMatch?.[1]) {
    preferences.role = preferenceMatch[1].trim();
  }
  return preferences;
};
