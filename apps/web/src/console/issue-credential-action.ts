"use server";

// F02 T057 — Server action for the operator credential issue form.
//
// Wires `parseIssueInput` (validation), Drizzle adapters
// (issuance repo, console audit sink), the env-loaded signing key,
// and `issueAgentCredentialByOperator` (orchestrator). Returns the
// `IssueResultState` the form's `useActionState` consumes.
//
// All deps are loaded at call time, not module load, so the
// signing-key error doesn't crash other routes that import this
// module's transitive surface.
//
// `'use server'` makes every export an RPC endpoint. Only
// `issueCredentialAction` is exported here; helpers/constants live
// in `issue-result-state.ts`.

import { randomUUID } from "node:crypto";

import {
  IssuanceConflictError,
  RoleRequiredError,
  issueAgentCredentialByOperator,
} from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../auth/get-principal";
import { createDrizzleAuditSink } from "../auth/audit-sink-db";
import { createDrizzleAgentCredentialRepo } from "../auth/agent-credential-issuance-repo";
import { loadAgentSigningKey } from "../auth/load-agent-signing-key";
import { parseIssueInput } from "./parse-issue-input";
import type { IssueResultState } from "./issue-credential-form";
import { EMPTY_ERRORS } from "./issue-result-state";

export async function issueCredentialAction(
  _state: IssueResultState,
  formData: FormData,
): Promise<IssueResultState> {
  const principal = await getPrincipal();

  // Defense-in-depth: if a non-operator somehow reaches this
  // surface (proxy gating bypassed, hypothetical), return a clean
  // role denial without leaking field-validation hints.
  if (principal.kind !== "human" || principal.tier !== "operator") {
    return {
      status: "error",
      serverError: "Operator role required.",
      errors: EMPTY_ERRORS,
    };
  }

  const parsed = parseIssueInput(formData);
  if (!parsed.ok) {
    return { status: "error", errors: parsed.errors };
  }

  try {
    const result = await issueAgentCredentialByOperator(
      principal,
      {
        run_id: parsed.value.run_id,
        side: parsed.value.side,
        contract_id: parsed.value.contract_id,
        contract_version: parsed.value.contract_version,
        ticket_id: parsed.value.ticket_id,
        scope_set: parsed.value.scope_set,
        ttl_seconds: parsed.value.ttl_seconds,
        agent_principal_id: parsed.value.agent_principal_id,
      },
      {
        repo: createDrizzleAgentCredentialRepo(getDb()),
        sink: createDrizzleAuditSink(getDb()),
        signingKey: loadAgentSigningKey(),
        issuer: process.env.SPYGLASS_ISSUER ?? "https://spyglass.local",
        audience: process.env.SPYGLASS_AUDIENCE_RUNNER ?? "spyglass.runner",
        newCredentialId: () => randomUUID(),
        now: () => Math.floor(Date.now() / 1000),
        correlationId: () => randomUUID(),
      },
    );
    return {
      status: "success",
      jwt: result.jwt,
      credential_id: result.credential_id,
      expires_at: result.expires_at,
    };
  } catch (err) {
    if (err instanceof IssuanceConflictError) {
      return {
        status: "error",
        serverError: `Credential already active for this (run, side, contract). Retry after ${err.retry_after_seconds}s or revoke the existing credential first.`,
        errors: EMPTY_ERRORS,
      };
    }
    if (err instanceof RoleRequiredError) {
      return {
        status: "error",
        serverError: "Operator role required.",
        errors: EMPTY_ERRORS,
      };
    }
    // Unexpected error: re-throw so the error boundary handles it.
    throw err;
  }
}
