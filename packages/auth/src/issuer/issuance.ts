// F02 T042/T043 — Agent-credential issuance orchestration (FR-17,
// FR-19, FR-20, EC-8).
//
// Pure orchestration: validates the caller, enforces the idempotency
// invariant on (run_id, side, contract_id, contract_version), mints
// the JWT, persists the `agent_credentials` row, emits the audit
// event. The tRPC procedure wraps this with framework concerns
// (request shaping, error mapping); production wiring injects
// Drizzle-backed repo + signing key from env.
//
// Operation order is mint-first then insert: signing has no side
// effects outside the returned token, so a signing failure leaves
// no orphan row that would lock the caller out of retries via the
// idempotency check.

import { requireScope, RoleRequiredError } from "../authorize.js";
import { isServicePrincipal, type Principal } from "../principal.js";
import { mintAgentCredential } from "./mint.js";
import { MAX_TTL_SECONDS, type MintResult } from "./types.js";
import type { SigningKeyMaterial } from "./key-source.js";
import type { AuditEventName, AuditEventSink } from "../materialize/types.js";

/** Scope required of the calling service principal. */
export const AGENT_CREDENTIAL_ISSUE_SCOPE = "auth.agent_credential.issue" as const;

/** Default TTL when caller omits `ttl_seconds`. Re-export so tests pin. */
export const DEFAULT_TTL_SECONDS = 1800;

export interface IssueAgentInput {
  readonly run_id: string;
  readonly side: "seeker" | "employer";
  readonly contract_id: string;
  readonly contract_version: string;
  readonly ticket_id: string;
  readonly scope_set: ReadonlyArray<string>;
  /** Default 1800s; clamped to ≤7200s (FR-20). */
  readonly ttl_seconds?: number;
  /**
   * The principal_id of the agent the credential authorizes. The
   * caller (F08 Parley runner) resolves this from the run + side.
   */
  readonly agent_principal_id: string;
}

export interface IssueAgentOutput {
  readonly jwt: string;
  readonly kid: string;
  readonly credential_id: string;
  readonly principal_id: string;
  readonly expires_at: number;
  readonly scopes: ReadonlyArray<string>;
}

export interface AgentCredentialRow {
  readonly credential_id: string;
  readonly principal_id: string;
  readonly run_id: string;
  readonly side: "seeker" | "employer";
  readonly contract_id: string;
  readonly contract_version: string;
  readonly scope_set: ReadonlyArray<string>;
  readonly kid: string;
  readonly expires_at: Date;
  readonly revoked_at: Date | null;
}

/**
 * Thrown by `AgentCredentialRepo.insert` when the (run_id, side,
 * contract_id, contract_version) unique index rejects the row. The
 * orchestrator catches this and re-runs `findByIdempotencyKey` to
 * surface the typed `IssuanceConflictError` to the caller.
 */
export class UniqueViolationError extends Error {
  constructor(cause?: unknown) {
    super("agent_credentials unique constraint violated");
    this.name = "UniqueViolationError";
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export interface AgentCredentialRepo {
  findByIdempotencyKey(input: {
    run_id: string;
    side: "seeker" | "employer";
    contract_id: string;
    contract_version: string;
  }): Promise<AgentCredentialRow | null>;
  /**
   * Insert a new credential row. MUST throw `UniqueViolationError`
   * (not a raw driver error) when the idempotency unique index
   * rejects the insert; the orchestrator relies on this to map the
   * race to `IssuanceConflictError`.
   */
  insert(row: {
    credential_id: string;
    principal_id: string;
    run_id: string;
    side: "seeker" | "employer";
    contract_id: string;
    contract_version: string;
    ticket_id: string;
    scope_set: ReadonlyArray<string>;
    kid: string;
    expires_at: Date;
  }): Promise<AgentCredentialRow>;
}

export class IssuanceConflictError extends Error {
  constructor(
    public readonly existing: AgentCredentialRow,
    public readonly retry_after_seconds: number,
  ) {
    super(
      `An agent credential for (run_id=${existing.run_id}, side=${existing.side}, ` +
        `contract=${existing.contract_id}@${existing.contract_version}) already exists. ` +
        `Reuse credential_id=${existing.credential_id} or wait ${retry_after_seconds}s for TTL.`,
    );
    this.name = "IssuanceConflictError";
  }
}

interface IssueDeps {
  readonly repo: AgentCredentialRepo;
  readonly sink: AuditEventSink;
  readonly signingKey: SigningKeyMaterial;
  readonly issuer: string;
  readonly audience: string;
  readonly newCredentialId: () => string;
  readonly now: () => number;
  readonly correlationId: () => string;
}

interface DenialContext {
  reason: string;
  reissue_of_credential_id?: string;
}

export async function issueAgentCredential(
  caller: Principal,
  input: IssueAgentInput,
  deps: IssueDeps,
): Promise<IssueAgentOutput> {
  const correlation_id = deps.correlationId();
  const baseAuditPayload = {
    run_id: input.run_id,
    side: input.side,
    contract_id: input.contract_id,
    contract_version: input.contract_version,
  };
  // Audit-sink failure must not mask the typed deny/success result.
  // Mirrors the safeEmit pattern in service-issuance.ts and the
  // safeDenyAudit pattern in revoke-all-sessions.ts; addresses
  // T068/MEDIUM-1.
  const emit = async (
    name: AuditEventName,
    extra: Readonly<Record<string, unknown>>,
  ): Promise<void> => {
    try {
      await deps.sink.emit({
        name,
        principal_id: caller.principal_id,
        correlation_id,
        payload: { ...baseAuditPayload, ...extra },
      });
    } catch (cause) {
      console.error("[issuance] audit sink emit failed", {
        name,
        correlation_id,
        cause: cause instanceof Error ? cause.message : String(cause),
      });
    }
  };
  const denyAndThrow = async (ctx: DenialContext, error: Error): Promise<never> => {
    await emit("agent_credential.issue_denied", {
      reason: ctx.reason,
      ...(ctx.reissue_of_credential_id
        ? { reissue_of_credential_id: ctx.reissue_of_credential_id }
        : {}),
    });
    throw error;
  };

  // FR-17: only service principals may mint agent credentials.
  if (!isServicePrincipal(caller)) {
    await denyAndThrow(
      { reason: `wrong_caller_kind:${caller.kind}` },
      new RoleRequiredError([], caller.kind),
    );
  }
  // FR-17: scope check. Throws ScopeRequiredError if missing.
  try {
    requireScope(caller, AGENT_CREDENTIAL_ISSUE_SCOPE);
  } catch (cause) {
    await denyAndThrow({ reason: "scope_insufficient" }, cause as Error);
  }

  // Defense-in-depth; mint also validates against ceiling/floor.
  const ttl = Math.min(
    Math.max(1, Math.floor(input.ttl_seconds ?? DEFAULT_TTL_SECONDS)),
    MAX_TTL_SECONDS,
  );

  // EC-8: idempotency check.
  const existing = await deps.repo.findByIdempotencyKey({
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
        new IssuanceConflictError(existing, expSec - nowSec),
      );
    }
    // Revoked or expired: fall through to mint a new credential.
    // Track for the audit event so reissue is distinguishable from
    // first-issue.
    reissue_of_credential_id = existing.credential_id;
  }

  const credential_id = deps.newCredentialId();
  const expiresAtDate = new Date((nowSec + ttl) * 1000);

  // Mint FIRST so a signing failure can't leave an orphan DB row
  // that would lock subsequent retries on idempotency.
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
    // Unreachable; satisfies TS control flow.
    throw cause;
  }

  // Insert AFTER mint succeeds. Map unique-violation to the typed
  // conflict error so the tRPC layer returns 409 with structured
  // fields instead of an opaque DB error.
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
          new IssuanceConflictError(raced, Math.max(0, expSec - nowSec)),
        );
      }
    }
    await denyAndThrow({ reason: `insert_failed:${(cause as Error).name}` }, cause as Error);
    throw cause; // unreachable
  }

  await emit("agent_credential.issued", {
    credential_id,
    agent_principal_id: input.agent_principal_id,
    ticket_id: input.ticket_id,
    scope_count: input.scope_set.length,
    kid: deps.signingKey.kid,
    ttl_seconds: ttl,
    ...(reissue_of_credential_id ? { reissue_of_credential_id } : {}),
  });

  return {
    jwt: mint.token,
    kid: mint.kid,
    credential_id,
    principal_id: input.agent_principal_id,
    expires_at: mint.claims.exp,
    scopes: input.scope_set,
  };
}
