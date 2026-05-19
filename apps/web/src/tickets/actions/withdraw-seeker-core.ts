import { requireRole, type HumanPrincipal } from "@spyglass/auth";
import type { SeekerTicketRow } from "@spyglass/db";

import { EMPTY_SUBMIT_ERRORS, type SubmitTicketResult } from "./submit-results";

export interface WithdrawSeekerRepo {
  withdrawSeekerIntent(
    principal: HumanPrincipal,
    seeker_ticket_id: string,
  ): Promise<{ seeker: SeekerTicketRow }>;
}

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function withdrawSeekerIntentForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: WithdrawSeekerRepo,
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

  const seekerTicketId = formString(formData, "seeker_ticket_id");
  if (!seekerTicketId) {
    return {
      status: "error",
      errors: { seeker_ticket_id: ["Required"] },
    };
  }

  const result = await repo.withdrawSeekerIntent(principal, seekerTicketId);
  return {
    status: "success",
    ticket_id: result.seeker.seeker_ticket_id,
    identifier: result.seeker.identifier,
    state: result.seeker.state,
  };
}
