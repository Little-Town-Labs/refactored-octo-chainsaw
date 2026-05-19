import { requireRole, type HumanPrincipal } from "@spyglass/auth";
import type { EmployerReqTicketRow, SeekerTicketRow } from "@spyglass/db";
import type { AmendTicketPatch } from "@spyglass/tickets";

import { EMPTY_SUBMIT_ERRORS, type SubmitTicketResult } from "./submit-results";

export interface AmendSourceRepo {
  amendSeekerIntent(
    principal: HumanPrincipal,
    seeker_ticket_id: string,
    patch: AmendTicketPatch,
  ): Promise<{ seeker: SeekerTicketRow }>;
  amendEmployerRequisition(
    principal: HumanPrincipal,
    employer_req_ticket_id: string,
    patch: AmendTicketPatch,
  ): Promise<{ employerReq: EmployerReqTicketRow }>;
}

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formNumber(formData: FormData, key: string): number | undefined {
  const value = formString(formData, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formList(formData: FormData, key: string): string[] | undefined {
  const value = formString(formData, key);
  if (value === undefined) return undefined;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parsePatch(formData: FormData): AmendTicketPatch {
  const patch: {
    comp_band_min?: number;
    comp_band_max?: number;
    jurisdictions?: string[];
    work_mode?: NonNullable<AmendTicketPatch["work_mode"]>;
    flags?: string[];
  } = {};
  const compBandMin = formNumber(formData, "comp_band_min");
  if (compBandMin !== undefined) patch.comp_band_min = compBandMin;
  const compBandMax = formNumber(formData, "comp_band_max");
  if (compBandMax !== undefined) patch.comp_band_max = compBandMax;
  const jurisdictions = formList(formData, "jurisdictions");
  if (jurisdictions !== undefined) patch.jurisdictions = jurisdictions;
  const workMode = formString(formData, "work_mode");
  if (workMode !== undefined) {
    patch.work_mode = workMode as NonNullable<AmendTicketPatch["work_mode"]>;
  }
  const flags = formList(formData, "flags");
  if (flags !== undefined) patch.flags = flags;
  return patch;
}

export async function amendSeekerIntentForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: AmendSourceRepo,
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
  if (!seekerTicketId) return { status: "error", errors: { seeker_ticket_id: ["Required"] } };

  const result = await repo.amendSeekerIntent(principal, seekerTicketId, parsePatch(formData));
  return {
    status: "success",
    ticket_id: result.seeker.seeker_ticket_id,
    identifier: result.seeker.identifier,
    state: result.seeker.state,
  };
}

export async function amendEmployerRequisitionForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: AmendSourceRepo,
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

  const employerReqTicketId = formString(formData, "employer_req_ticket_id");
  if (!employerReqTicketId) {
    return { status: "error", errors: { employer_req_ticket_id: ["Required"] } };
  }

  const result = await repo.amendEmployerRequisition(
    principal,
    employerReqTicketId,
    parsePatch(formData),
  );
  return {
    status: "success",
    ticket_id: result.employerReq.employer_req_ticket_id,
    identifier: result.employerReq.identifier,
    state: result.employerReq.state,
  };
}
