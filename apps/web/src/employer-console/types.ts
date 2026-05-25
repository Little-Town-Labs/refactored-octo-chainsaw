import type {
  DossierProjectionRow,
  DossierSignatureRow,
  EmployerOrganizationProfileRow,
  EmployerReqTicketRow,
  MatchTicketRow,
} from "@spyglass/db";

export const EMPLOYER_CONSOLE_PAGE_SIZE = 50;
export const EMPLOYER_CONSOLE_MAX_PAGE_SIZE = 100;

export type EmployerConsoleCapability = "profile:write" | "req:write" | "candidate:read";

export interface EmployerConsoleSession {
  readonly principal_id: string;
  readonly org_id: string;
  readonly tier: "employer_admin" | "employer_member";
  readonly capabilities: ReadonlyArray<EmployerConsoleCapability>;
}

export interface EmployerProfileInput {
  readonly company_name: string;
  readonly company_summary: string;
  readonly mission: string;
  readonly culture: string;
  readonly benefits: string;
  readonly workplace_policy: string;
}

export interface EmployerProfileViewModel extends EmployerProfileInput {
  readonly profile_id: string | null;
  readonly org_id: string;
  readonly updated_at: Date | null;
}

export interface ReqCloseInput {
  readonly employer_req_ticket_id: string;
  readonly terminal_state: "filled" | "closed";
  readonly reason_code: string;
  readonly notes?: string | undefined;
}

export interface ParsedPagination {
  readonly cursor?: string;
  readonly limit: number;
}

export interface ReqListResult {
  readonly rows: ReadonlyArray<EmployerReqTicketRow>;
  readonly next_cursor: string | null;
}

export interface CandidateInboxEntry {
  readonly match: MatchTicketRow;
  readonly employer_req: EmployerReqTicketRow;
  readonly projection: DossierProjectionRow | null;
  readonly signature: DossierSignatureRow | null;
}

export interface CandidateInboxResult {
  readonly rows: ReadonlyArray<CandidateInboxEntry>;
  readonly next_cursor: string | null;
}

export function profileFromRow(
  orgId: string,
  row: EmployerOrganizationProfileRow | null,
): EmployerProfileViewModel {
  return {
    org_id: orgId,
    profile_id: row?.profile_id ?? null,
    company_name: row?.company_name ?? "",
    company_summary: row?.company_summary ?? "",
    mission: row?.mission ?? "",
    culture: row?.culture ?? "",
    benefits: row?.benefits ?? "",
    workplace_policy: row?.workplace_policy ?? "",
    updated_at: row?.updated_at ?? null,
  };
}
