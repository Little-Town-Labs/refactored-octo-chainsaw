// F02 T057 — Server-action input parser for the operator issue
// form. Pure: takes raw FormData (or its plain-object equivalent),
// validates each field, returns a discriminated `ok | invalid`
// result. The action wrapper feeds `ok.value` to the orchestrator
// and renders `invalid.errors` next to the offending fields.
//
// Keeping validation in a pure module keeps the form testable
// without standing up Next's server-action runtime in jsdom and
// gives us one place to enumerate every constraint (FR-19, FR-20).
//
// FR-19: scope_set must be non-empty.
// FR-20: ttl_seconds ≤ 7200 (so ttl_minutes ≤ 120).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_TTL_MINUTES = 120;
const MIN_TTL_MINUTES = 1;

export type IssueFormField =
  | "run_id"
  | "agent_principal_id"
  | "side"
  | "contract_id"
  | "contract_version"
  | "ticket_id"
  | "scope_set"
  | "ttl_minutes";

export interface ValidIssueInput {
  readonly run_id: string;
  readonly agent_principal_id: string;
  readonly side: "seeker" | "employer";
  readonly contract_id: string;
  readonly contract_version: string;
  readonly ticket_id: string;
  readonly scope_set: ReadonlyArray<string>;
  readonly ttl_seconds: number;
}

export type ParseIssueInputResult =
  | { readonly ok: true; readonly value: ValidIssueInput }
  | { readonly ok: false; readonly errors: Readonly<Record<IssueFormField, string | undefined>> };

function pickString(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function pickStrings(form: FormData, key: string): string[] {
  return form
    .getAll(key)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

export function parseIssueInput(form: FormData): ParseIssueInputResult {
  const errors: Record<IssueFormField, string | undefined> = {
    run_id: undefined,
    agent_principal_id: undefined,
    side: undefined,
    contract_id: undefined,
    contract_version: undefined,
    ticket_id: undefined,
    scope_set: undefined,
    ttl_minutes: undefined,
  };

  const run_id = pickString(form, "run_id");
  if (!UUID_RE.test(run_id)) errors.run_id = "Must be a UUID.";

  const agent_principal_id = pickString(form, "agent_principal_id");
  if (!UUID_RE.test(agent_principal_id)) errors.agent_principal_id = "Must be a UUID.";

  const sideRaw = pickString(form, "side");
  const side: ValidIssueInput["side"] | undefined =
    sideRaw === "seeker" || sideRaw === "employer" ? sideRaw : undefined;
  if (!side) errors.side = "Choose seeker or employer.";

  const contract_id = pickString(form, "contract_id");
  if (contract_id.length === 0) errors.contract_id = "Required.";

  const contract_version = pickString(form, "contract_version");
  if (contract_version.length === 0) errors.contract_version = "Required.";

  const ticket_id = pickString(form, "ticket_id");
  if (!UUID_RE.test(ticket_id)) errors.ticket_id = "Must be a UUID.";

  const scope_set = pickStrings(form, "scope_set");
  if (scope_set.length === 0) errors.scope_set = "Select at least one scope.";

  const ttlRaw = pickString(form, "ttl_minutes");
  const ttlNum = Number(ttlRaw);
  let ttl_seconds = 0;
  if (!Number.isFinite(ttlNum) || !Number.isInteger(ttlNum)) {
    errors.ttl_minutes = "Must be a whole number.";
  } else if (ttlNum < MIN_TTL_MINUTES || ttlNum > MAX_TTL_MINUTES) {
    errors.ttl_minutes = `Must be between ${MIN_TTL_MINUTES} and ${MAX_TTL_MINUTES} minutes.`;
  } else {
    ttl_seconds = ttlNum * 60;
  }

  const hasErrors = Object.values(errors).some((v) => v !== undefined);
  if (hasErrors || !side) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      run_id,
      agent_principal_id,
      side,
      contract_id,
      contract_version,
      ticket_id,
      scope_set,
      ttl_seconds,
    },
  };
}
