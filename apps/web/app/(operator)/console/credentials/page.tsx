// F02 T056 — Operator credentials list page (`/operator/console/credentials`).
//
// Thin RSC wrapper:
//   1. `getPrincipal()` — fail-safe deny (proxy.ts already audience-
//      and AAL2-gated, but we still pass the principal through to
//      `listAgentCredentialsForOperator` for the in-function tier
//      check, defense-in-depth).
//   2. `parseListParams` — narrow URL searchParams to the typed
//      input the orchestrator expects.
//   3. `listAgentCredentialsForOperator` — pure, tested in @spyglass/auth.
//   4. `<CredentialsListView>` — pure, tested in jsdom.
//
// Errors:
//   - Authorization failures (`RoleRequiredError`) bubble — the
//     route should never receive them since the proxy denies non-
//     operators upstream, but if they do reach here Next renders
//     the nearest `error.tsx` boundary (fail-safe deny).
//   - `InvalidCursorError` is caught and the listing is retried
//     without the cursor so a malformed shareable link doesn't 500.

import { listAgentCredentialsForOperator, InvalidCursorError } from "@spyglass/auth";
import { getDb } from "@spyglass/db";
import type { JSX } from "react";

import { getPrincipal } from "../../../../src/auth/get-principal.js";
import { createDrizzleAgentCredentialListRepo } from "../../../../src/auth/agent-credential-list-repo.js";
import { CredentialsListView } from "../../../../src/console/credentials-list-view.js";
import { parseListParams } from "../../../../src/console/parse-search-params.js";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CredentialsListPage(props: PageProps): Promise<JSX.Element> {
  const principal = await getPrincipal();
  const raw = await props.searchParams;
  const initialParams = parseListParams(raw);

  const repo = createDrizzleAgentCredentialListRepo(getDb());
  const nowSec = Math.floor(Date.now() / 1000);
  const deps = { repo, now: () => nowSec };

  let params = initialParams;
  let result;
  try {
    result = await listAgentCredentialsForOperator(principal, params, deps);
  } catch (err) {
    if (!(err instanceof InvalidCursorError)) throw err;
    // Drop the bad cursor; render the unfiltered first page so a
    // shareable link with a stale/garbled cursor stays usable. The
    // retry passes no cursor so InvalidCursorError cannot recur.
    const { cursor: _drop, ...safe } = params;
    void _drop;
    params = safe;
    result = await listAgentCredentialsForOperator(principal, params, deps);
  }

  return (
    <CredentialsListView rows={result.rows} next_cursor={result.next_cursor} params={params} />
  );
}
