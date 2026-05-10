// F02 T059 — Pure view for `/operator/console/audit`.
//
// Read-only audit-event viewer (NFR-10, plan §12 Q4). All data is
// passed in; the RSC page owns the data fetch + auth. Splitting the
// view out keeps the test surface plain jsdom rendering.
//
// Accessibility:
//   - caption + scope="col" headers
//   - role="status" empty state
//   - role_or_scope renders "—" for service/agent rows (per
//     `audit-sink-db.ts` v0 semantics: only `human` populates this
//     column today)
//   - truncated principal IDs use `<abbr title>` so sighted users
//     can hover for the full UUID, and the cell link's `aria-label`
//     exposes it to assistive tech.

import Link from "next/link";
import type { JSX } from "react";

import type { AuditEventsListRow } from "../auth/audit-events-list-repo.js";
import type { ParsedAuditParams } from "./parse-audit-search-params.js";

export interface AuditEventsListViewProps {
  readonly rows: ReadonlyArray<AuditEventsListRow>;
  readonly next_cursor: string | null;
  readonly params: ParsedAuditParams;
}

function buildHref(params: ParsedAuditParams, cursor: string | null): string {
  const sp = new URLSearchParams();
  if (params.principal_id) sp.set("principalId", params.principal_id);
  if (cursor) sp.set("cursor", cursor);
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

export function AuditEventsListView({
  rows,
  next_cursor,
  params,
}: AuditEventsListViewProps): JSX.Element {
  const filtered = params.principal_id !== undefined;

  return (
    <section aria-labelledby="audit-heading">
      <h1 id="audit-heading">Audit events</h1>

      {filtered ? (
        <nav aria-label="Audit filters">
          <span>
            Filtered by principal <code>{params.principal_id}</code>
          </span>{" "}
          <Link href={buildHref({}, null)}>Clear filter</Link>
        </nav>
      ) : null}

      {rows.length === 0 ? (
        <p role="status">No audit events match the current filter.</p>
      ) : (
        <table>
          <caption>Audit events, newest first.</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Event</th>
              <th scope="col">Principal</th>
              <th scope="col">Kind</th>
              <th scope="col">Role / scope</th>
              <th scope="col">Correlation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.event_id}>
                <td>
                  <time dateTime={r.created_at.toISOString()}>{r.created_at.toISOString()}</time>
                </td>
                <td>{r.event_name}</td>
                <td>
                  <Link
                    href={buildHref({ principal_id: r.principal_id }, null)}
                    aria-label={`Filter by principal ${r.principal_id}`}
                  >
                    <abbr title={r.principal_id}>
                      <code>{r.principal_id.slice(0, 8)}…</code>
                    </abbr>
                  </Link>
                </td>
                <td>{r.principal_kind}</td>
                <td>{r.role_or_scope ?? "—"}</td>
                <td>
                  <code>{r.correlation_id}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {next_cursor ? (
        <nav aria-label="Pagination">
          <Link href={buildHref(params, next_cursor)} rel="next">
            Next page
          </Link>
        </nav>
      ) : null}
    </section>
  );
}
