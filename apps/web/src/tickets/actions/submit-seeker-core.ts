import { requireRole, type HumanPrincipal } from "@spyglass/auth";
import type { SeekerTicketRow } from "@spyglass/db";
import type { SeekerDraftFields, SeekerTransitionArgs } from "@spyglass/tickets";

import { parseSeekerIntentInput } from "./parse-ticket-form";
import { EMPTY_SUBMIT_ERRORS, type SubmitTicketResult } from "./submit-results";

export interface SubmitSeekerRepo {
  insertDraft(principal: HumanPrincipal, fields: SeekerDraftFields): Promise<SeekerTicketRow>;
  transition(args: SeekerTransitionArgs): Promise<SeekerTicketRow>;
}

export async function submitSeekerIntentForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: SubmitSeekerRepo,
): Promise<SubmitTicketResult> {
  try {
    requireRole(principal, "seeker");
  } catch {
    return {
      status: "error",
      serverError: "Seeker role required.",
      errors: EMPTY_SUBMIT_ERRORS,
    };
  }

  const parsed = parseSeekerIntentInput(formData);
  if (!parsed.ok || !parsed.value) {
    return { status: "error", errors: parsed.errors };
  }

  const draft = await repo.insertDraft(principal, parsed.value);
  const submitted = await repo.transition({
    seeker_ticket_id: draft.seeker_ticket_id,
    to: "submitted",
    principal,
  });
  return {
    status: "success",
    ticket_id: submitted.seeker_ticket_id,
    identifier: submitted.identifier,
    state: submitted.state,
  };
}
