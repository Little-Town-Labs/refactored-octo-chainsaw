// F02 T052 — Service-credential bootstrap + rotation orchestration
// (FR-23..FR-26a, FR-25, NFR-5, EC-7).
//
// Two operations live here:
//
//   1. `bootstrapServiceCredential` — exchange a one-shot env-manifest
//      bootstrap secret for an F02-signed service credential. There is
//      no calling `Principal`; the secret IS the auth (FR-26 / FR-26a).
//      Bootstrap always lands at `rotation_generation = 1`; the
//      partial-unique index `(principal_id, rotation_generation)`
//      catches double-bootstrap during deploy races.
//
//   2. `rotateServiceCredential` — the live service authenticates
//      with its current credential and exchanges it for a fresh one
//      at `generation + 1`. Old generations remain verifiable until
//      their `expires_at` (FR-25 / NFR-5). The same uniqueness index
//      catches double-rotation races.
//
// Operation order is mint-first then insert: signing has no side
// effects outside the returned token, so a signing failure leaves no
// orphan row that would lock the caller out via the unique index.

import { requireScope, RoleRequiredError } from "../authorize.js";
import { isServicePrincipal, type Principal } from "../principal.js";
import { mintServiceCredential } from "./service-mint.js";
import { MAX_TTL_SECONDS, type ServiceMintResult } from "./types.js";
import type { SigningKeyMaterial } from "./key-source.js";
import type { AuditEventName, AuditEventSink } from "../materialize/types.js";

/** Scope required of a service principal calling rotation. */
export const SERVICE_CREDENTIAL_ROTATION_SCOPE = "auth.service_credential.rotate" as const;

/** Default TTL when caller omits `ttl_seconds`. */
export const DEFAULT_SERVICE_TTL_SECONDS = 1800;

// ---------------------------------------------------------------------
// Repo + checker contracts
// ---------------------------------------------------------------------

export interface ServiceCredentialRow {
  readonly credential_id: string;
  readonly principal_id: string;
  readonly scope_set: ReadonlyArray<string>;
  readonly kid: string;
  readonly rotation_generation: number;
  readonly expires_at: Date;
  revoked_at: Date | null;
}

/**
 * Thrown by `ServiceCredentialRepo.insert` when the
 * `(principal_id, rotation_generation)` unique index rejects the
 * row. The orchestrator maps this to `ServiceIssuanceConflictError`.
 */
export class ServiceUniqueViolationError extends Error {
  constructor(cause?: unknown) {
    super("service_credentials unique constraint violated");
    this.name = "ServiceUniqueViolationError";
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export interface ServiceCredentialRepo {
  findByPrincipalAndGeneration(input: {
    principal_id: string;
    rotation_generation: number;
  }): Promise<ServiceCredentialRow | null>;
  /**
   * Highest-generation row for the principal that is still LIVE
   * (not revoked, not expired), or null if none. Rotation gates on
   * this so a revoked credential cannot extend its lifetime by
   * rotating into a fresh generation (FR-25 revoke semantics).
   */
  findLatestActiveByPrincipal(input: {
    principal_id: string;
    now: Date;
  }): Promise<ServiceCredentialRow | null>;
  /**
   * Insert a new credential row. MUST throw
   * `ServiceUniqueViolationError` (not a raw driver error) when the
   * `(principal_id, rotation_generation)` unique index rejects the
   * insert.
   */
  insert(row: {
    credential_id: string;
    principal_id: string;
    scope_set: ReadonlyArray<string>;
    kid: string;
    rotation_generation: number;
    expires_at: Date;
  }): Promise<ServiceCredentialRow>;
}

/**
 * Verifies a presented bootstrap secret against the registered
 * service principal's deploy-time material (env-manifest). Production
 * wires this against F01's env scope; tests inject a fake.
 *
 * **Implementations MUST use constant-time comparison** when matching
 * the presented secret against the registered material. A naive `===`
 * leaks length/prefix via timing. Use `crypto.timingSafeEqual` over
 * fixed-length digests of both sides.
 */
export interface BootstrapSecretChecker {
  check(input: { service_principal_id: string; presented_secret: string }): Promise<boolean>;
}

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

export class InvalidBootstrapSecretError extends Error {
  constructor() {
    super("Bootstrap secret rejected by F02 trust anchor (FR-26a).");
    this.name = "InvalidBootstrapSecretError";
  }
}

export class ServiceIssuanceConflictError extends Error {
  constructor(
    public readonly existing: ServiceCredentialRow,
    public readonly retry_after_seconds: number,
  ) {
    super(
      `A service credential for principal_id=${existing.principal_id} at ` +
        `generation=${existing.rotation_generation} already exists. ` +
        `Reuse credential_id=${existing.credential_id} or wait ${retry_after_seconds}s for TTL.`,
    );
    this.name = "ServiceIssuanceConflictError";
  }
}

export class EmptyServiceScopeSetError extends Error {
  constructor() {
    super("Service credentials require at least one scope (FR-24); empty scope set rejected.");
    this.name = "EmptyServiceScopeSetError";
  }
}

export class NoPriorCredentialError extends Error {
  constructor(public readonly principal_id: string) {
    super(
      `Cannot rotate service credential for principal_id=${principal_id}: no prior credential ` +
        `exists. Run bootstrap first (FR-26a).`,
    );
    this.name = "NoPriorCredentialError";
  }
}

export class PrincipalMismatchError extends Error {
  constructor(
    public readonly caller_principal_id: string,
    public readonly target_principal_id: string,
  ) {
    super(
      `Caller principal_id=${caller_principal_id} cannot rotate credentials for ` +
        `principal_id=${target_principal_id}.`,
    );
    this.name = "PrincipalMismatchError";
  }
}

// ---------------------------------------------------------------------
// Inputs / outputs
// ---------------------------------------------------------------------

export interface BootstrapServiceInput {
  readonly service_principal_id: string;
  readonly bootstrap_secret: string;
  readonly scope_set: ReadonlyArray<string>;
  /** Default 1800s; clamped to ≤7200s (FR-20 by analogy). */
  readonly ttl_seconds?: number;
}

export interface RotateServiceInput {
  readonly service_principal_id: string;
  readonly scope_set: ReadonlyArray<string>;
  readonly ttl_seconds?: number;
}

export interface ServiceCredentialOutput {
  readonly jwt: string;
  readonly kid: string;
  readonly credential_id: string;
  readonly principal_id: string;
  readonly rotation_generation: number;
  readonly expires_at: number;
  readonly scopes: ReadonlyArray<string>;
}

interface ServiceIssueDeps {
  readonly repo: ServiceCredentialRepo;
  readonly sink: AuditEventSink;
  readonly signingKey: SigningKeyMaterial;
  readonly issuer: string;
  readonly audience: string;
  readonly bootstrapChecker: BootstrapSecretChecker;
  readonly newCredentialId: () => string;
  readonly now: () => number;
  readonly correlationId: () => string;
}

// ---------------------------------------------------------------------
// Bootstrap (FR-26 / FR-26a)
// ---------------------------------------------------------------------

export async function bootstrapServiceCredential(
  input: BootstrapServiceInput,
  deps: ServiceIssueDeps,
): Promise<ServiceCredentialOutput> {
  const correlation_id = deps.correlationId();
  const denyAndThrow = makeDenyAndThrow({
    sink: deps.sink,
    eventName: "service_credential.bootstrap_denied",
    principal_id: input.service_principal_id,
    service_principal_id: input.service_principal_id,
    correlation_id,
  });

  // Validate scopes before consulting the secret checker — a malformed
  // request shouldn't trigger an out-of-band secret comparison.
  if (input.scope_set.length === 0) {
    await denyAndThrow("empty_scope_set", new EmptyServiceScopeSetError());
  }

  const secretOk = await deps.bootstrapChecker.check({
    service_principal_id: input.service_principal_id,
    presented_secret: input.bootstrap_secret,
  });
  if (!secretOk) {
    await denyAndThrow("invalid_bootstrap_secret", new InvalidBootstrapSecretError());
  }

  const ttl = clampTtl(input.ttl_seconds);
  const generation = 1;

  const existing = await deps.repo.findByPrincipalAndGeneration({
    principal_id: input.service_principal_id,
    rotation_generation: generation,
  });
  if (existing !== null) {
    await denyAndThrow(
      "generation_conflict",
      new ServiceIssuanceConflictError(existing, retryAfterSeconds(existing, deps.now())),
      { rotation_generation: generation },
    );
  }

  return await mintAndInsert({
    deps,
    principal_id: input.service_principal_id,
    scope_set: input.scope_set,
    ttl,
    generation,
    correlation_id,
    successEvent: "service_credential.bootstrapped",
    failureEvent: "service_credential.bootstrap_denied",
    successPayload: {},
  });
}

// ---------------------------------------------------------------------
// Rotation (FR-25 / NFR-5)
// ---------------------------------------------------------------------

export async function rotateServiceCredential(
  caller: Principal,
  input: RotateServiceInput,
  deps: ServiceIssueDeps,
): Promise<ServiceCredentialOutput> {
  const correlation_id = deps.correlationId();
  const denyAndThrow = makeDenyAndThrow({
    sink: deps.sink,
    eventName: "service_credential.rotation_denied",
    principal_id: caller.principal_id,
    service_principal_id: input.service_principal_id,
    correlation_id,
  });

  if (!isServicePrincipal(caller)) {
    await denyAndThrow(`wrong_caller_kind:${caller.kind}`, new RoleRequiredError([], caller.kind));
  }
  try {
    requireScope(caller, SERVICE_CREDENTIAL_ROTATION_SCOPE);
  } catch (cause) {
    await denyAndThrow("scope_insufficient", cause as Error);
  }
  if (caller.principal_id !== input.service_principal_id) {
    await denyAndThrow(
      "principal_mismatch",
      new PrincipalMismatchError(caller.principal_id, input.service_principal_id),
    );
  }
  if (input.scope_set.length === 0) {
    await denyAndThrow("empty_scope_set", new EmptyServiceScopeSetError());
  }

  const latest = await deps.repo.findLatestActiveByPrincipal({
    principal_id: input.service_principal_id,
    now: new Date(deps.now() * 1000),
  });
  if (latest === null) {
    await denyAndThrow(
      "no_prior_credential",
      new NoPriorCredentialError(input.service_principal_id),
    );
    throw new NoPriorCredentialError(input.service_principal_id); // unreachable; TS narrowing.
  }
  const fromGeneration = latest.rotation_generation;
  const generation = fromGeneration + 1;
  const ttl = clampTtl(input.ttl_seconds);

  return await mintAndInsert({
    deps,
    principal_id: input.service_principal_id,
    scope_set: input.scope_set,
    ttl,
    generation,
    correlation_id,
    successEvent: "service_credential.rotated",
    failureEvent: "service_credential.rotation_denied",
    successPayload: { from_generation: fromGeneration, to_generation: generation },
  });
}

// ---------------------------------------------------------------------
// Shared mint+insert path
// ---------------------------------------------------------------------

interface MintAndInsertArgs {
  readonly deps: ServiceIssueDeps;
  readonly principal_id: string;
  readonly scope_set: ReadonlyArray<string>;
  readonly ttl: number;
  readonly generation: number;
  readonly correlation_id: string;
  readonly successEvent: AuditEventName;
  readonly failureEvent: AuditEventName;
  readonly successPayload: Readonly<Record<string, unknown>>;
}

async function mintAndInsert(args: MintAndInsertArgs): Promise<ServiceCredentialOutput> {
  const { deps, principal_id, scope_set, ttl, generation, correlation_id } = args;

  const denyAndThrow = makeDenyAndThrow({
    sink: deps.sink,
    eventName: args.failureEvent,
    principal_id,
    service_principal_id: principal_id,
    correlation_id,
  });
  const generationExtra = { rotation_generation: generation };

  const credential_id = deps.newCredentialId();
  const nowSec = deps.now();
  const expiresAtDate = new Date((nowSec + ttl) * 1000);

  let mint: ServiceMintResult;
  try {
    mint = await mintServiceCredential({
      request: {
        principal_id,
        scopes: scope_set,
        issuer: deps.issuer,
        audience: deps.audience,
        ttlSeconds: ttl,
        generation,
      },
      credential_id,
      signingKey: deps.signingKey,
      now: deps.now,
    });
  } catch (cause) {
    const err = toError(cause);
    await denyAndThrow(`mint_failed:${err.name}`, err, generationExtra);
    throw err; // unreachable; TS narrowing for `mint` below.
  }

  try {
    await deps.repo.insert({
      credential_id,
      principal_id,
      scope_set,
      kid: deps.signingKey.kid,
      rotation_generation: generation,
      expires_at: expiresAtDate,
    });
  } catch (cause) {
    if (cause instanceof ServiceUniqueViolationError) {
      const raced = await deps.repo.findByPrincipalAndGeneration({
        principal_id,
        rotation_generation: generation,
      });
      if (raced !== null) {
        await denyAndThrow(
          "generation_race",
          new ServiceIssuanceConflictError(raced, retryAfterSeconds(raced, nowSec)),
          generationExtra,
        );
      }
      // Unique violation but the row vanished between insert and
      // re-find (e.g., concurrent revoke + cleanup). Distinct from a
      // generic insert failure so operators can spot the race.
      await denyAndThrow("generation_race_unresolved", cause, generationExtra);
    }
    const err = toError(cause);
    await denyAndThrow(`insert_failed:${err.name}`, err, generationExtra);
  }

  await safeEmit(deps.sink, {
    name: args.successEvent,
    principal_id,
    correlation_id,
    payload: {
      service_principal_id: principal_id,
      credential_id,
      kid: deps.signingKey.kid,
      rotation_generation: generation,
      scope_count: scope_set.length,
      ttl_seconds: ttl,
      ...args.successPayload,
    },
  });

  return {
    jwt: mint.token,
    kid: mint.kid,
    credential_id,
    principal_id,
    rotation_generation: generation,
    expires_at: mint.claims.exp,
    scopes: scope_set,
  };
}

interface DenyContext {
  readonly sink: AuditEventSink;
  readonly eventName: AuditEventName;
  readonly principal_id: string;
  readonly service_principal_id: string;
  readonly correlation_id: string;
}

type DenyAndThrow = (
  reason: string,
  error: Error,
  extra?: Readonly<Record<string, unknown>>,
) => Promise<never>;

/**
 * Build a typed deny-and-throw closure that emits an audit event via
 * `safeEmit` (so an audit-sink failure cannot mask the typed denial
 * error the caller expects) and then throws. Returns `Promise<never>`
 * so callers awaiting it get TS narrowing without redundant post-throws.
 */
function makeDenyAndThrow(ctx: DenyContext): DenyAndThrow {
  return async (reason, error, extra = {}) => {
    await safeEmit(ctx.sink, {
      name: ctx.eventName,
      principal_id: ctx.principal_id,
      correlation_id: ctx.correlation_id,
      payload: { service_principal_id: ctx.service_principal_id, reason, ...extra },
    });
    throw error;
  };
}

function retryAfterSeconds(row: ServiceCredentialRow, nowSec: number): number {
  const expSec = Math.floor(row.expires_at.getTime() / 1000);
  return Math.max(0, expSec - nowSec);
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function clampTtl(ttl_seconds?: number): number {
  return Math.min(
    Math.max(1, Math.floor(ttl_seconds ?? DEFAULT_SERVICE_TTL_SECONDS)),
    MAX_TTL_SECONDS,
  );
}

/**
 * Emit an audit event without letting a sink failure mask the
 * caller's denial error. Fail-safe deny must hold even when audit is
 * temporarily unhealthy; F05's pipeline retains its own retry/replay
 * semantics, so swallowing here is the lesser evil vs. surfacing an
 * AuditSinkError in place of the security-relevant error.
 */
async function safeEmit(
  sink: AuditEventSink,
  event: Parameters<AuditEventSink["emit"]>[0],
): Promise<void> {
  try {
    await sink.emit(event);
  } catch (cause) {
    // Log to stderr only; never throw. Deliberate: audit-sink failure
    // must not be the reason a denial path bubbles a different error
    // than the typed one the caller expects.
    console.error("[service-issuance] audit sink emit failed", {
      name: event.name,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
