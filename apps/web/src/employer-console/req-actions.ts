"use server";

import { getDb } from "@spyglass/db";
import type { HumanPrincipal } from "@spyglass/auth";
import {
  createDrizzleTicketStore,
  createEmployerReqRepo,
  createSourceWorkflowRepo,
  drizzleSequenceExecutor,
  nextIdentifier,
} from "@spyglass/tickets";

import { getPrincipal } from "../auth/get-principal";
import {
  amendEmployerRequisitionForPrincipal,
  type AmendSourceRepo,
} from "../tickets/actions/amend-source-core";
import { submitEmployerRequisitionForPrincipal } from "../tickets/actions/submit-employer-core";
import type { SubmitEmployerReqRepo } from "../tickets/actions/submit-employer-core";
import { parseReqCloseInput } from "./parsers";
import { getEmployerConsoleSession } from "./session";
import type { EmployerConsoleActionResult } from "./employer-profile-action";

export async function createEmployerReqForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: SubmitEmployerReqRepo,
): Promise<EmployerConsoleActionResult> {
  const result = await submitEmployerRequisitionForPrincipal(principal, formData, repo);
  if (result.status === "error") return result;
  return {
    status: "success",
    id: result.ticket_id,
    identifier: result.identifier,
    state: result.state,
  };
}

export async function amendEmployerReqForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: AmendSourceRepo,
): Promise<EmployerConsoleActionResult> {
  const result = await amendEmployerRequisitionForPrincipal(principal, formData, repo);
  if (result.status === "error") return result;
  return {
    status: "success",
    id: result.ticket_id,
    identifier: result.identifier,
    state: result.state,
  };
}

export async function closeEmployerReqForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: Pick<ReturnType<typeof createEmployerReqRepo>, "transition">,
): Promise<EmployerConsoleActionResult> {
  try {
    getEmployerConsoleSession(principal, "admin");
  } catch {
    return { status: "error", serverError: "Req close is not available.", errors: {} };
  }
  const parsed = parseReqCloseInput(formData);
  if (!parsed.ok || !parsed.value) return { status: "error", errors: parsed.errors };
  const row = await repo.transition({
    employer_req_ticket_id: parsed.value.employer_req_ticket_id,
    to: parsed.value.terminal_state,
    reason_code: parsed.value.reason_code,
    principal,
    ...(parsed.value.notes !== undefined ? { notes: parsed.value.notes } : {}),
  });
  return {
    status: "success",
    id: row.employer_req_ticket_id,
    identifier: row.identifier,
    state: row.state,
  };
}

function employerReqRepo() {
  const db = getDb();
  return createEmployerReqRepo({
    store: createDrizzleTicketStore(db),
    allocateIdentifier: () =>
      nextIdentifier({ kind: "employer_req_ticket", executor: drizzleSequenceExecutor(db) }),
  });
}

export async function createEmployerReq(formData: FormData): Promise<EmployerConsoleActionResult> {
  return createEmployerReqForPrincipal(await getPrincipal(), formData, employerReqRepo());
}

export async function createEmployerReqSubmit(formData: FormData): Promise<void> {
  await createEmployerReq(formData);
}

export async function amendEmployerReq(formData: FormData): Promise<EmployerConsoleActionResult> {
  const store = createDrizzleTicketStore(getDb());
  return amendEmployerReqForPrincipal(
    await getPrincipal(),
    formData,
    createSourceWorkflowRepo({ store }),
  );
}

export async function amendEmployerReqSubmit(formData: FormData): Promise<void> {
  await amendEmployerReq(formData);
}

export async function closeEmployerReq(formData: FormData): Promise<EmployerConsoleActionResult> {
  return closeEmployerReqForPrincipal(await getPrincipal(), formData, employerReqRepo());
}

export async function closeEmployerReqSubmit(formData: FormData): Promise<void> {
  await closeEmployerReq(formData);
}
