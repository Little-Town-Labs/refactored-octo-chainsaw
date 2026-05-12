"use server";

// F02 T060 — Server action for the sign-out confirmation page.
//
// Wires parser + Drizzle adapters + Clerk session-revoker + audit
// sink + orchestrator (revokeAllSessionsForPrincipal). Two redirect
// targets:
//
//   - `executed`: returns to /operator/console/credentials with a
//     flash. Sessions are gone at the IdP.
//   - `pending_approval`: returns to the sign-out page itself with
//     `?flash=pending&approval_id=...` so the operator sees the
//     approval banner and can share the second-operator link.
//
// Typed orchestrator errors propagate so the page's error.tsx
// renders the appropriate deny message. The Clerk revoke happens
// inside the orchestrator AFTER the approval row is marked executed;
// a Clerk failure surfaces as a 500 here (the audit row still
// records the denial via the orchestrator's deny-audit path).

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { RoleRequiredError, revokeAllSessionsForPrincipal } from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../auth/get-principal";
import { createDrizzleAuditSink } from "../auth/audit-sink-db";
import { createClerkSessionRevoker } from "../auth/clerk-session-revoker";
import {
  createDrizzlePrincipalKindLookup,
  createDrizzleRevokeAllApprovalRepo,
  createSessionRevokerFromClerkRevoker,
} from "../auth/revoke-all-sessions-repos";
import { parseSignOutInput } from "./parse-sign-out-input";
import { SignOutFormInvalidError } from "./sign-out-errors";

export async function signOutAction(formData: FormData): Promise<void> {
  const principal = await getPrincipal();
  if (principal.kind !== "human" || principal.tier !== "operator") {
    throw new RoleRequiredError(["operator"], principal.kind);
  }

  const parsed = parseSignOutInput(formData);
  if (!parsed.ok) {
    throw new SignOutFormInvalidError(parsed.errors);
  }

  const db = getDb();
  const result = await revokeAllSessionsForPrincipal(
    principal,
    {
      target_principal_id: parsed.value.target_principal_id,
      reason_code: parsed.value.reason_code,
      ...(parsed.value.notes !== undefined ? { notes: parsed.value.notes } : {}),
      ...(parsed.value.approval_id !== undefined ? { approval_id: parsed.value.approval_id } : {}),
    },
    {
      approvalRepo: createDrizzleRevokeAllApprovalRepo(db),
      principalLookup: createDrizzlePrincipalKindLookup(db),
      sessionRevoker: createSessionRevokerFromClerkRevoker(createClerkSessionRevoker()),
      sink: createDrizzleAuditSink(db),
      now: () => Math.floor(Date.now() / 1000),
      correlationId: () => randomUUID(),
    },
  );

  if (result.status === "pending_approval") {
    const search = new URLSearchParams({
      flash: "pending",
      approval_id: result.approval_id,
    });
    redirect(
      `/operator/console/credentials/${parsed.value.target_principal_id}/sign-out?${search.toString()}`,
    );
  }

  const search = new URLSearchParams({ flash: "signed_out" });
  redirect(`/operator/console/credentials?${search.toString()}`);
}
