import type { NoticeTimingEvidence } from "./types.js";

export function noticeTiming(input: {
  readonly basis: NoticeTimingEvidence["basis"];
  readonly produced_at: Date;
  readonly business_days_required?: number;
  readonly calendar_ref?: string | null;
  readonly required_notice_by?: Date | null;
  readonly earliest_delivery_at?: Date | null;
}): NoticeTimingEvidence {
  const businessDaysRequired = input.business_days_required ?? 0;
  if (businessDaysRequired < 0) throw new Error("invalid_payload");
  if (input.basis === "advance_notice" && !input.earliest_delivery_at) {
    throw new Error("invalid_payload");
  }
  return {
    basis: input.basis,
    produced_at: input.produced_at,
    required_notice_by: input.required_notice_by ?? null,
    earliest_delivery_at: input.earliest_delivery_at ?? null,
    business_days_required: businessDaysRequired,
    calendar_ref: input.calendar_ref ?? null,
  };
}

export function isTimingEligible(timing: NoticeTimingEvidence, evaluatedAt: Date): boolean {
  if (!timing.earliest_delivery_at) return true;
  return evaluatedAt.getTime() >= timing.earliest_delivery_at.getTime();
}
