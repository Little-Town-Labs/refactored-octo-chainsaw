import type { SeekerConversationEvent, SeekerProfileDraft } from "./types.js";

const REQUIRED_PROFILE_FIELDS = ["name", "target_role"] as const;

export const buildProfileDraft = (event: SeekerConversationEvent): SeekerProfileDraft => {
  const text = event.text ?? "";
  const fields = parseFields(text);
  const flags = classifyUntrustedInput(text, event.attachmentRefs ?? []);
  return {
    profileDraftId: `profile:${event.seekerId}`,
    seekerId: event.seekerId,
    ...(text.trim().length > 0 ? { resumeTextRef: `resume-text:${event.eventId}` } : {}),
    ...(event.attachmentRefs?.[0] ? { resumeFileRef: event.attachmentRefs[0] } : {}),
    structuredFields: fields,
    missingRequiredFields: REQUIRED_PROFILE_FIELDS.filter((field) => fields[field] === undefined),
    untrustedInputFlags: flags,
    sourceChannel: event.channel,
    updatedAt: event.receivedAt,
  };
};

export const isProfileComplete = (draft: SeekerProfileDraft): boolean =>
  draft.missingRequiredFields.length === 0 && !draft.untrustedInputFlags.includes("over-size");

const parseFields = (text: string): Readonly<Record<string, string>> => {
  const fields: Record<string, string> = {};
  for (const part of text.split(";")) {
    const [rawKey, rawValue] = part.split("=").map((value) => value?.trim());
    if (rawKey && rawValue) {
      fields[rawKey.toLowerCase()] = rawValue;
    }
  }
  return fields;
};

export const classifyUntrustedInput = (
  text: string,
  attachmentRefs: readonly string[],
): readonly string[] => {
  const flags: string[] = [];
  if (text.length > 8_000) {
    flags.push("over-size");
  }
  if (/ignore previous|system prompt|developer message/i.test(text)) {
    flags.push("prompt-injection");
  }
  if (attachmentRefs.some((ref) => !/^file:[a-z0-9][a-z0-9._:-]*$/i.test(ref))) {
    flags.push("unsupported-attachment");
  }
  return flags;
};
