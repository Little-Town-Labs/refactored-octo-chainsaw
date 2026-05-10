// F02 T059 — searchParams parser for `/operator/console/audit`.
//
// Validates and narrows raw URL searchParams into the typed shape
// the audit page needs. Mirrors `parse-search-params.ts` (credentials
// list): invalid values silently fall through to defaults so a
// malformed link still renders the safe view.
//
// `cursor` is opaque (base64url-encoded JSON) and decoded by the
// page itself. We only length-cap it here so a multi-megabyte cursor
// never reaches the SQL layer.

// Real cursors are ~80 chars (base64url of `{c:ISO,e:UUID}`). Cap
// well above that but tight enough that a hostile shareable link
// can't push a multi-KB JSON-bomb through the decoder. Defense-in-
// depth — the page also try/catches the decode.
const MAX_CURSOR_LENGTH = 512;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedAuditParams {
  readonly principal_id?: string;
  readonly cursor?: string;
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseAuditParams(
  raw: Record<string, string | string[] | undefined>,
): ParsedAuditParams {
  const out: { principal_id?: string; cursor?: string } = {};

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
