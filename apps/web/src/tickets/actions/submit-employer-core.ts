import { requireRole, type HumanPrincipal } from "@spyglass/auth";
import type { EmployerReqTicketRow } from "@spyglass/db";
import type { EmployerReqDraftFields, EmployerReqTransitionArgs } from "@spyglass/tickets";

import { parseEmployerRequisitionInput } from "./parse-ticket-form";
import { EMPTY_SUBMIT_ERRORS, type SubmitTicketResult } from "./submit-results";

export interface SubmitEmployerReqRepo {
  insertDraft(
    principal: HumanPrincipal,
    fields: EmployerReqDraftFields,
  ): Promise<EmployerReqTicketRow>;
  transition(args: EmployerReqTransitionArgs): Promise<EmployerReqTicketRow>;
}

export async function submitEmployerRequisitionForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: SubmitEmployerReqRepo,
): Promise<SubmitTicketResult> {
  try {
    requireRole(principal, "employer_admin");
  } catch {
    return {
      status: "error",
      serverError: "Employer admin role required.",
      errors: EMPTY_SUBMIT_ERRORS,
    };
  }

  if (!principal.org_id) {
    return {
      status: "error",
      serverError: "Employer organization required.",
      errors: EMPTY_SUBMIT_ERRORS,
    };
  }

  const parsed = parseEmployerRequisitionInput(formData);
  if (!parsed.ok || !parsed.value) {
    return { status: "error", errors: parsed.errors };
  }

  const draft = await repo.insertDraft(principal, {
    ...parsed.value,
    org_id: principal.org_id,
  });
  const submitted = await repo.transition({
    employer_req_ticket_id: draft.employer_req_ticket_id,
    to: "submitted",
    principal,
  });
  return {
    status: "success",
    ticket_id: submitted.employer_req_ticket_id,
    identifier: submitted.identifier,
    state: submitted.state,
  };
}
