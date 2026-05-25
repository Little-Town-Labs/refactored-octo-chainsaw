import { z } from "zod";

import {
  EMPLOYER_CONSOLE_MAX_PAGE_SIZE,
  EMPLOYER_CONSOLE_PAGE_SIZE,
  type EmployerProfileInput,
  type ParsedPagination,
  type ReqCloseInput,
} from "./types";

export interface ParseResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly errors: Record<string, string[]>;
}

const profileSchema = z.object({
  company_name: z.string().trim().min(1),
  company_summary: z.string().trim().min(1),
  mission: z.string().trim().min(1),
  culture: z.string().trim().min(1),
  benefits: z.string().trim().min(1),
  workplace_policy: z.string().trim().min(1),
});

const closeSchema = z.object({
  employer_req_ticket_id: z.string().uuid(),
  terminal_state: z.enum(["filled", "closed"]),
  reason_code: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

function first(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorsFor(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors;
}

export function parseEmployerProfileInput(formData: FormData): ParseResult<EmployerProfileInput> {
  const parsed = profileSchema.safeParse({
    company_name: formString(formData, "company_name"),
    company_summary: formString(formData, "company_summary"),
    mission: formString(formData, "mission"),
    culture: formString(formData, "culture"),
    benefits: formString(formData, "benefits"),
    workplace_policy: formString(formData, "workplace_policy"),
  });
  if (!parsed.success) return { ok: false, errors: errorsFor(parsed.error) };
  return { ok: true, value: parsed.data, errors: {} };
}

export function parseReqCloseInput(formData: FormData): ParseResult<ReqCloseInput> {
  const parsed = closeSchema.safeParse({
    employer_req_ticket_id: formString(formData, "employer_req_ticket_id"),
    terminal_state: formString(formData, "terminal_state"),
    reason_code: formString(formData, "reason_code"),
    notes: formString(formData, "notes") || undefined,
  });
  if (!parsed.success) return { ok: false, errors: errorsFor(parsed.error) };
  return {
    ok: true,
    value: {
      employer_req_ticket_id: parsed.data.employer_req_ticket_id,
      terminal_state: parsed.data.terminal_state,
      reason_code: parsed.data.reason_code,
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    },
    errors: {},
  };
}

export function parsePaginationParams(
  raw: Record<string, string | string[] | undefined>,
): ParsedPagination {
  const cursor = first(raw.cursor);
  const requested = Number(first(raw.limit));
  const limit = Number.isInteger(requested)
    ? Math.max(1, Math.min(requested, EMPLOYER_CONSOLE_MAX_PAGE_SIZE))
    : EMPLOYER_CONSOLE_PAGE_SIZE;
  return {
    limit,
    ...(cursor && cursor.length <= 512 ? { cursor } : {}),
  };
}
