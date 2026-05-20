import type { EmployerReqTicketRow, MatchTicketRow, SeekerTicketRow } from "@spyglass/db";

import type { EvaluateJurisdictionGateInput } from "./evaluator.js";

export function seekerTicketGateInput(
  ticket: Pick<SeekerTicketRow, "seeker_ticket_id" | "jurisdictions" | "principal_id">,
  correlationId: string,
): EvaluateJurisdictionGateInput {
  return {
    subject_kind: "seeker_ticket",
    subject_id: ticket.seeker_ticket_id,
    jurisdiction_codes: ticket.jurisdictions,
    correlation_id: correlationId,
    principal_id: ticket.principal_id,
  };
}

export function employerReqTicketGateInput(
  ticket: Pick<EmployerReqTicketRow, "employer_req_ticket_id" | "jurisdictions" | "principal_id">,
  correlationId: string,
): EvaluateJurisdictionGateInput {
  return {
    subject_kind: "employer_req_ticket",
    subject_id: ticket.employer_req_ticket_id,
    jurisdiction_codes: ticket.jurisdictions,
    correlation_id: correlationId,
    principal_id: ticket.principal_id,
  };
}

export function matchTicketGateInput(
  ticket: Pick<MatchTicketRow, "match_ticket_id" | "decision_locus_jurisdiction">,
  correlationId: string,
  principalId: string | null,
): EvaluateJurisdictionGateInput {
  return {
    subject_kind: "match_ticket",
    subject_id: ticket.match_ticket_id,
    jurisdiction_codes: [ticket.decision_locus_jurisdiction],
    correlation_id: correlationId,
    principal_id: principalId,
  };
}
