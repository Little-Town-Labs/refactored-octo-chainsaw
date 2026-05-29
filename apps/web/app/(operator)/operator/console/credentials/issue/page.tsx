// F02 T057 — Operator credential issue form page.
//
// RSC. Authentication is enforced by `proxy.ts` (operator audience
// + AAL2). The page calls `getPrincipal()` for defense-in-depth and
// renders the client form which posts to the server action.
//
// `availableScopes` is intentionally narrow at v0 — the operator
// runbook for emergency issuance enumerates the scopes that may be
// granted out-of-band. v1 will derive this from the contract
// registry once F03 (contracts) lands.

import type { JSX } from "react";

import { getPrincipal } from "../../../../../../src/auth/get-principal";
import { issueCredentialAction } from "../../../../../../src/console/issue-credential-action";
import { IssueCredentialForm } from "../../../../../../src/console/issue-credential-form";

const AVAILABLE_SCOPES: ReadonlyArray<string> = [
  "dossier.read",
  "dossier.write",
  "policy.gate.vote",
];

export default async function IssueCredentialPage(): Promise<JSX.Element> {
  await getPrincipal();
  return <IssueCredentialForm action={issueCredentialAction} availableScopes={AVAILABLE_SCOPES} />;
}
