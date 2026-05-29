// F02 T058 — Revoke confirmation page
// (`/operator/console/credentials/[principal_id]/revoke`).
//
// RSC. Loads the live credentials for the target principal so the
// operator sees what will be revoked, then renders the confirmation
// form which posts to the revoke server action. Authentication is
// enforced by `proxy.ts` (operator audience + AAL2); we still
// re-check the operator tier for defense-in-depth.
//
// `params` is async in Next 16. We `await` it before reading
// principal_id, then validate as a UUID — a non-UUID URL segment
// renders the empty state rather than reaching SQL.

import { notFound } from "next/navigation";
import type { JSX } from "react";

import { RoleRequiredError, listAgentCredentialsForOperator } from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../../../src/auth/get-principal";
import { createDrizzleAgentCredentialListRepo } from "../../../../../../../src/auth/agent-credential-list-repo";
import { revokeCredentialAction } from "../../../../../../../src/console/revoke-credential-action";
import { RevokeConfirmationView } from "../../../../../../../src/console/revoke-confirmation-view";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  readonly params: Promise<{ principal_id: string }>;
}

export default async function RevokePage(props: PageProps): Promise<JSX.Element> {
  const principal = await getPrincipal();
  if (principal.kind !== "human" || principal.tier !== "operator") {
    // Same deny semantics as the action — error.tsx renders the
    // typed deny rather than a 404 that would conflate "not
    // authorized" with "doesn't exist".
    throw new RoleRequiredError(["operator"], principal.kind);
  }

  const { principal_id } = await props.params;
  // Non-UUID URL segment IS a not-found (the route is principal-
  // shaped); 404 is the correct semantic here vs. a deny.
  if (!UUID_RE.test(principal_id)) notFound();

  const repo = createDrizzleAgentCredentialListRepo(getDb());
  const result = await listAgentCredentialsForOperator(
    principal,
    { principal_id, status: "active", limit: 200 },
    { repo, now: () => Math.floor(Date.now() / 1000) },
  );

  return (
    <RevokeConfirmationView
      principalId={principal_id}
      liveCredentials={result.rows}
      action={revokeCredentialAction}
      cancelHref="/operator/console/credentials"
    />
  );
}
