// F02 T057 — Plain (non-'use server') module for `IssueResultState`
// helpers. Splitting this out keeps `issue-credential-action.ts`
// limited to a single async export so its `'use server'` directive
// surfaces exactly one callable RPC endpoint.

import type { IssueFormField } from "./parse-issue-input";

export const EMPTY_ERRORS: Readonly<Record<IssueFormField, string | undefined>> = Object.freeze({
  run_id: undefined,
  agent_principal_id: undefined,
  side: undefined,
  contract_id: undefined,
  contract_version: undefined,
  ticket_id: undefined,
  scope_set: undefined,
  ttl_minutes: undefined,
});
