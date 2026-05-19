import { requireRole, type HumanPrincipal } from "@spyglass/auth";
import type {
  EmployerReqTicketRow,
  EmployerReqTicketState,
  MatchTicketRow,
  MatchTicketState,
  SeekerTicketRow,
  SeekerTicketState,
} from "@spyglass/db";
import {
  MATCH_ADVANCE_SCOPE,
  MissingReasonCodeError,
  MissingScopeError,
  OPERATOR_REASON_CODES,
  OPERATOR_TRANSITION_SCOPE,
  type AdvanceMatchArgs,
  type EmployerReqTransitionArgs,
  type SeekerTransitionArgs,
} from "@spyglass/tickets";
import { z } from "zod";

import { EMPTY_SUBMIT_ERRORS, type SubmitTicketResult } from "./submit-results";

export type OperatorTransitionKind = "seeker" | "employer_req" | "match";

export interface OperatorTransitionRepos {
  readonly seeker: {
    transition(args: SeekerTransitionArgs): Promise<SeekerTicketRow>;
  };
  readonly employerReq: {
    transition(args: EmployerReqTransitionArgs): Promise<EmployerReqTicketRow>;
  };
  readonly match: {
    advanceMatch(args: AdvanceMatchArgs): Promise<MatchTicketRow>;
  };
}

const operatorTransitionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("seeker"),
    ticket_id: z.string().uuid(),
    to: z.enum(["draft", "submitted", "screening", "matching", "matched", "closed", "withdrawn"]),
    reason_code: z.enum(OPERATOR_REASON_CODES),
  }),
  z.object({
    kind: z.literal("employer_req"),
    ticket_id: z.string().uuid(),
    to: z.enum(["draft", "submitted", "open", "matching", "filled", "closed", "withdrawn"]),
    reason_code: z.enum(OPERATOR_REASON_CODES),
  }),
  z.object({
    kind: z.literal("match"),
    ticket_id: z.string().uuid(),
    to: z.enum(["created", "negotiating", "delivered", "accepted", "rejected", "expired"]),
    reason_code: z.enum(OPERATOR_REASON_CODES),
    dossier_id: z.string().uuid().optional(),
    run_id: z.string().uuid().optional(),
  }),
]);

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseOperatorTransition(formData: FormData) {
  const raw = {
    kind: formString(formData, "kind"),
    ticket_id: formString(formData, "ticket_id"),
    to: formString(formData, "to"),
    reason_code: formString(formData, "reason_code"),
    dossier_id: formString(formData, "dossier_id"),
    run_id: formString(formData, "run_id"),
  };
  return operatorTransitionSchema.safeParse(raw);
}

function requireOperatorTransitionScope(scopes: readonly string[]): void {
  if (!scopes.includes(OPERATOR_TRANSITION_SCOPE)) {
    throw new MissingScopeError(OPERATOR_TRANSITION_SCOPE);
  }
}

function resultFor(
  kind: OperatorTransitionKind,
  row: SeekerTicketRow | EmployerReqTicketRow | MatchTicketRow,
): SubmitTicketResult {
  if (kind === "seeker") {
    const seekerRow = row as SeekerTicketRow;
    return {
      status: "success",
      ticket_id: seekerRow.seeker_ticket_id,
      identifier: seekerRow.identifier,
      state: seekerRow.state,
    };
  }
  if (kind === "employer_req") {
    const employerReqRow = row as EmployerReqTicketRow;
    return {
      status: "success",
      ticket_id: employerReqRow.employer_req_ticket_id,
      identifier: employerReqRow.identifier,
      state: employerReqRow.state,
    };
  }
  const matchRow = row as MatchTicketRow;
  return {
    status: "success",
    ticket_id: matchRow.match_ticket_id,
    identifier: matchRow.identifier,
    state: matchRow.state,
  };
}

export async function operatorTransitionForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repos: OperatorTransitionRepos,
  grantedScopes: readonly string[],
): Promise<SubmitTicketResult> {
  try {
    requireRole(principal, "operator");
    requireOperatorTransitionScope(grantedScopes);
  } catch (err) {
    if (err instanceof MissingScopeError) throw err;
    return {
      status: "error",
      serverError: "Operator role required.",
      errors: EMPTY_SUBMIT_ERRORS,
    };
  }

  if (!formString(formData, "reason_code")) {
    throw new MissingReasonCodeError("operator_transition", "unknown", "unknown");
  }

  const parsed = parseOperatorTransition(formData);
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const input = parsed.data;
  if (input.kind === "seeker") {
    const row = await repos.seeker.transition({
      seeker_ticket_id: input.ticket_id,
      to: input.to as SeekerTicketState,
      principal,
      reason_code: input.reason_code,
      scopes: grantedScopes,
    });
    return resultFor(input.kind, row);
  }

  if (input.kind === "employer_req") {
    const row = await repos.employerReq.transition({
      employer_req_ticket_id: input.ticket_id,
      to: input.to as EmployerReqTicketState,
      principal,
      reason_code: input.reason_code,
      scopes: grantedScopes,
    });
    return resultFor(input.kind, row);
  }

  const row = await repos.match.advanceMatch({
    match_ticket_id: input.ticket_id,
    to: input.to as MatchTicketState,
    principal,
    reason_code: input.reason_code,
    dossier_id: input.dossier_id ?? null,
    run_id: input.run_id ?? null,
    scopes: [MATCH_ADVANCE_SCOPE],
  });
  return resultFor(input.kind, row);
}
