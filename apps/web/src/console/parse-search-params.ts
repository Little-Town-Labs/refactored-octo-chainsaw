// F02 T056 — searchParams parser for `/operator/console/credentials`.
//
// Pure helper: validates and narrows the URL searchParams into the
// shape `listAgentCredentialsForOperator` accepts. Invalid values
// fall through to defaults so a malformed URL renders the safe
// (status='all', no filter) view rather than 500'ing.
//
// `cursor` is passed straight through; the listing orchestrator
// owns the (paranoid) base64url+JSON validation. We only check
// length here so a multi-megabyte cursor never reaches the SQL
// layer.

const MAX_CURSOR_LENGTH = 4096;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParsedListParams = {
  readonly status: "active" | "revoked" | "all";
  readonly principal_id?: string;
  readonly cursor?: string;
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseListParams(
  raw: Record<string, string | string[] | undefined>,
): ParsedListParams {
  const statusRaw = pickFirst(raw.status);
  const status: ParsedListParams["status"] =
    statusRaw === "active" || statusRaw === "revoked" ? statusRaw : "all";

  const out: { status: ParsedListParams["status"]; principal_id?: string; cursor?: string } = {
    status,
  };

  const pid = pickFirst(raw.principalId);
  if (pid !== undefined && UUID_RE.test(pid)) {
    out.principal_id = pid;
  }

  const cursor = pickFirst(raw.cursor);
  if (cursor !== undefined && cursor.length > 0 && cursor.length <= MAX_CURSOR_LENGTH) {
    out.cursor = cursor;
  }

  return out;
}
