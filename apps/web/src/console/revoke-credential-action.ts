"use server";

// F02 T058 — Server action for the revoke confirmation page.
//
// Wires `parseRevokeInput` (validation) + Drizzle revoke repos +
// console audit sink + `revokeAgentCredential` (orchestrator from
// B4.4). On success, redirects back to the credentials list with
// a flash query param so the operator sees a status message. On
// validation failure, throws `RevokeFormInvalidError` so error.tsx
// renders the typed deny.
//
// FOLLOW-UP (B6 close): the orchestrator's `RevokeRepo.markRevoked`
// is idempotent on `revoked_at IS NULL` — under concurrent revoke
// the loser writes 0 rows but still appears in `revoked_count`.
// Switch the contract to return affected rows so the audit count is
// accurate. This change crosses the package boundary and is
// deferred.

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { RoleRequiredError, revokeAgentCredential } from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../auth/get-principal.js";
import { createDrizzleAuditSink } from "../auth/audit-sink-db.js";
import {
  createDrizzleRevocationListRepo,
  createDrizzleRevokeRepo,
} from "../auth/revocation-repos.js";
import { parseRevokeInput } from "./parse-revoke-input.js";

export class RevokeFormInvalidError extends Error {
  readonly errors: Readonly<Record<string, string | undefined>>;
  constructor(errors: Readonly<Record<string, string | undefined>>) {
    super("Revoke form failed validation.");
    this.name = "RevokeFormInvalidError";
    this.errors = errors;
  }
}

export async function revokeCredentialAction(formData: FormData): Promise<void> {
  const principal = await getPrincipal();
  if (principal.kind !== "human" || principal.tier !== "operator") {
    throw new RoleRequiredError(["operator"], principal.kind);
  }

  const parsed = parseRevokeInput(formData);
  if (!parsed.ok) {
    throw new RevokeFormInvalidError(parsed.errors);
  }

  const db = getDb();
  const result = await revokeAgentCredential(
    principal,
    {
      principal_id: parsed.value.principal_id,
      reason_code: parsed.value.reason_code,
      ...(parsed.value.notes !== undefined ? { notes: parsed.value.notes } : {}),
    },
    {
      repo: createDrizzleRevokeRepo(db),
      listRepo: createDrizzleRevocationListRepo(db),
      sink: createDrizzleAuditSink(db),
      now: () => Math.floor(Date.now() / 1000),
      correlationId: () => randomUUID(),
    },
  );

  const search = new URLSearchParams({
    flash: "revoked",
    count: String(result.revoked_credential_ids.length),
  });
  redirect(`/operator/console/credentials?${search.toString()}`);
}
