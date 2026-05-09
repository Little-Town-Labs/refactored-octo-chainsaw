// F02 T056 — Pure view for `/operator/console/credentials`.
//
// All data is passed in; this component does no I/O. The RSC page
// (`page.tsx`) owns the data fetch + auth context and hands shaped
// props to this view. Splitting it out keeps the test surface
// straightforward jsdom rendering rather than RSC-async rendering,
// which Jest doesn't model well.
//
// Accessibility: caption, scope="col", aria-sort=none for now (sort
// not yet implemented), aria-live polite for transient empty state,
// non-color status indicator (text label + icon-free).

import Link from "next/link";
import type { JSX } from "react";

import type { AgentCredentialListRow } from "@spyglass/auth";

import type { ParsedListParams } from "./parse-search-params.js";

export interface CredentialsListViewProps {
  readonly rows: ReadonlyArray<AgentCredentialListRow>;
  readonly next_cursor: string | null;
  readonly params: ParsedListParams;
}

function buildHref(params: ParsedListParams, cursor: string | null): string {
  const sp = new URLSearchParams();
  if (params.status !== "all") sp.set("status", params.status);
  if (params.principal_id) sp.set("principalId", params.principal_id);
  if (cursor) sp.set("cursor", cursor);
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

function rowStatus(row: AgentCredentialListRow, now: Date): "revoked" | "expired" | "active" {
  if (row.revoked_at !== null) return "revoked";
  if (row.expires_at <= now) return "expired";
  return "active";
}

export function CredentialsListView({
  rows,
  next_cursor,
  params,
}: CredentialsListViewProps): JSX.Element {
  const now = new Date();

  return (
    <section aria-labelledby="credentials-heading">
      <h1 id="credentials-heading">Agent credentials</h1>

      <nav aria-label="Filter credentials">
        <Link
          href={buildHref({ ...params, status: "all" }, null)}
          aria-current={params.status === "all" ? "page" : undefined}
        >
          All
        </Link>{" "}
        <Link
          href={buildHref({ ...params, status: "active" }, null)}
          aria-current={params.status === "active" ? "page" : undefined}
        >
          Active
        </Link>{" "}
        <Link
          href={buildHref({ ...params, status: "revoked" }, null)}
          aria-current={params.status === "revoked" ? "page" : undefined}
        >
          Revoked
        </Link>
      </nav>

      {rows.length === 0 ? (
        <p role="status">No credentials match the current filter.</p>
      ) : (
        <table>
          <caption>Agent credentials, newest first.</caption>
          <thead>
            <tr>
              <th scope="col">Credential</th>
              <th scope="col">Principal</th>
              <th scope="col">Contract</th>
              <th scope="col">Side</th>
              <th scope="col">Scopes</th>
              <th scope="col">Issued</th>
              <th scope="col">Expires</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = rowStatus(r, now);
              return (
                <tr key={r.credential_id}>
                  <td>
                    <code>{r.credential_id.slice(0, 8)}…</code>
                  </td>
                  <td>
                    <code>{r.principal_id.slice(0, 8)}…</code>
                  </td>
                  <td>
                    {r.contract_id} {r.contract_version}
                  </td>
                  <td>{r.side}</td>
                  <td>{r.scope_set.join(", ")}</td>
                  <td>
                    <time dateTime={r.issued_at.toISOString()}>{r.issued_at.toISOString()}</time>
                  </td>
                  <td>
                    <time dateTime={r.expires_at.toISOString()}>{r.expires_at.toISOString()}</time>
                  </td>
                  <td data-status={status}>{status}</td>
                </tr>
              );
            })}
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
