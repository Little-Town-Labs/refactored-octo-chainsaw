// F02 T057 — Operator-driven agent credential issuance.
//
// The "manual / emergency" path. The normal issuance flow is service-
// driven (FR-17): the F08 Parley runner mints credentials at agent
// spin-up. This orchestrator exists for operators to mint credentials
// out-of-band — typically when the runner can't, e.g. during an
// incident or for backfilling a credential that the runner failed
// to persist.
//
// Caller policy. Operator-only (tier='operator', AAL2 enforced
// upstream at the proxy per FR-12). Service principals are NOT
// allowed here — they have `issueAgentCredential` (which requires
// the issue scope and emits `agent_credential.issued`). Splitting
// the surfaces means audit consumers can distinguish runner-driven
// from operator-driven issuance without parsing scope-set fields.
//
// Idempotency. Same (run_id, side, contract_id, contract_version)
// invariant as the service path. If an active credential exists,
// the operator gets `IssuanceConflictError` (so they can't acci-
// dentally double-issue under load); revoked/expired credentials
// fall through and the new credential carries `reissue_of_credential_id`
// in the audit payload.
//
// Operation order: mint → insert → emit, identical to the service
// orchestrator. Same fail-safe properties (signing failure leaves
// no orphan row; insert race is mapped to the typed conflict error).

import { RoleRequiredError } from "../authorize.js";
import { isHumanPrincipal, type Principal } from "../principal.js";
import {
  IssuanceConflictError,
  UniqueViolationError,
  type AgentCredentialRepo,
  type AgentCredentialRow,
  type IssueAgentInput,
  type IssueAgentOutput,
  DEFAULT_TTL_SECONDS,
} from "./issuance.js";
import { mintAgentCredential } from "./mint.js";
import { MAX_TTL_SECONDS, type MintResult } from "./types.js";
import type { SigningKeyMaterial } from "./key-source.js";
import type { AuditEventName, AuditEventSink } from "../materialize/types.js";

export interface IssueByOperatorDeps {
  readonly repo: AgentCredentialRepo;
  readonly sink: AuditEventSink;
  readonly signingKey: SigningKeyMaterial;
  readonly issuer: string;
  readonly audience: string;
  readonly newCredentialId: () => string;
  readonly now: () => number;
  readonly correlationId: () => string;
}

export async function issueAgentCredentialByOperator(
  caller: Principal,
  input: IssueAgentInput,
  deps: IssueByOperatorDeps,
): Promise<IssueAgentOutput> {
  const correlation_id = deps.correlationId();
  const baseAuditPayload = {
    run_id: input.run_id,
    side: input.side,
    contract_id: input.contract_id,
    contract_version: input.contract_version,
  };
  // Audit-emit failures must NOT mask the domain error — operator
  // issuance has to deny safely even if F05's pipeline is sad.
  const safeEmit = async (name: AuditEventName, extra: Readonly<Record<string, unknown>>) => {
    try {
      await deps.sink.emit({
        name,
        principal_id: caller.principal_id,
        correlation_id,
        payload: { ...baseAuditPayload, ...extra },
      });
    } catch {
      /* swallow: see comment above */
    }
  };
  const denyAndThrow = async (
    ctx: { reason: string; reissue_of_credential_id?: string },
    error: Error,
  ): Promise<never> => {
    await safeEmit("agent_credential.issue_by_operator_denied", {
      reason: ctx.reason,
      ...(ctx.reissue_of_credential_id
        ? { reissue_of_credential_id: ctx.reissue_of_credential_id }
        : {}),
    });
    throw error;
  };

  if (!(isHumanPrincipal(caller) && caller.tier === "operator")) {
    await denyAndThrow(
      { reason: `wrong_caller_kind:${caller.kind}` },
      new RoleRequiredError(
        ["operator"],
        caller.kind,
        isHumanPrincipal(caller) ? caller.tier : undefined,
      ),
    );
  }

  const ttl = Math.min(
    Math.max(1, Math.floor(input.ttl_seconds ?? DEFAULT_TTL_SECONDS)),
    MAX_TTL_SECONDS,
  );

  const existing: AgentCredentialRow | null = await deps.repo.findByIdempotencyKey({
    run_id: input.run_id,
    side: input.side,
    contract_id: input.contract_id,
    contract_version: input.contract_version,
  });

  const nowSec = deps.now();
  let reissue_of_credential_id: string | undefined;
  if (existing !== null) {
    const expSec = Math.floor(existing.expires_at.getTime() / 1000);
    const isActive = existing.revoked_at === null && expSec > nowSec;
    if (isActive) {
      await denyAndThrow(
        { reason: "idempotency_conflict" },
        new IssuanceConflictError(existing, Math.min(MAX_TTL_SECONDS, expSec - nowSec)),
      );
    }
    reissue_of_credential_id = existing.credential_id;
  }

  const credential_id = deps.newCredentialId();
  const expiresAtDate = new Date((nowSec + ttl) * 1000);

  let mint: MintResult;
  try {
    mint = await mintAgentCredential({
      request: {
        principal_id: input.agent_principal_id,
        run_id: input.run_id,
        side: input.side,
        contract_id: input.contract_id,
        contract_version: input.contract_version,
        ticket_id: input.ticket_id,
        scopes: input.scope_set,
        issuer: deps.issuer,
        audience: deps.audience,
        ttlSeconds: ttl,
      },
      credential_id,
      signingKey: deps.signingKey,
      now: deps.now,
    });
  } catch (cause) {
    await denyAndThrow(
      {
        reason: `mint_failed:${(cause as Error).name}`,
        ...(reissue_of_credential_id ? { reissue_of_credential_id } : {}),
      },
      cause as Error,
    );
    throw cause; // unreachable; required for TS to narrow `mint`.
  }

  try {
    await deps.repo.insert({
      credential_id,
      principal_id: input.agent_principal_id,
      run_id: input.run_id,
      side: input.side,
      contract_id: input.contract_id,
      contract_version: input.contract_version,
      ticket_id: input.ticket_id,
      scope_set: input.scope_set,
      kid: deps.signingKey.kid,
      expires_at: expiresAtDate,
    });
  } catch (cause) {
    if (cause instanceof UniqueViolationError) {
      const raced = await deps.repo.findByIdempotencyKey({
        run_id: input.run_id,
        side: input.side,
        contract_id: input.contract_id,
        contract_version: input.contract_version,
      });
      if (raced !== null) {
        const expSec = Math.floor(raced.expires_at.getTime() / 1000);
        await denyAndThrow(
          { reason: "idempotency_race" },
          new IssuanceConflictError(raced, Math.min(MAX_TTL_SECONDS, Math.max(0, expSec - nowSec))),
        );
      }
    }
    await denyAndThrow({ reason: `insert_failed:${(cause as Error).name}` }, cause as Error);
    throw cause; // unreachable; required for TS to narrow control flow.
  }

  await safeEmit("agent_credential.issued_by_operator", {
    credential_id,
    agent_principal_id: input.agent_principal_id,
    ticket_id: input.ticket_id,
    scope_count: input.scope_set.length,
    kid: deps.signingKey.kid,
    ...(reissue_of_credential_id ? { reissue_of_credential_id } : {}),
  });

  return {
    jwt: mint.token,
    kid: deps.signingKey.kid,
    credential_id,
    principal_id: input.agent_principal_id,
    expires_at: nowSec + ttl,
    scopes: input.scope_set,
  };
}
