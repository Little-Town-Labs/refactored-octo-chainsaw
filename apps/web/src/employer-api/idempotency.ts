import { createHash } from "node:crypto";

import { conflict } from "./errors";

export interface IdempotencyRecord {
  readonly org_id: string;
  readonly credential_id: string;
  readonly operation: string;
  readonly idempotency_key: string;
  readonly request_fingerprint: string;
  readonly response_status: number;
  readonly response_body: unknown;
  readonly response_body_hash: string;
  readonly resource_type?: string;
  readonly resource_id?: string;
  readonly expires_at: Date;
}

export interface IdempotencyRepo {
  find(
    orgId: string,
    operation: string,
    idempotencyKey: string,
    now: Date,
  ): Promise<IdempotencyRecord | null>;
  insert(record: IdempotencyRecord): Promise<void>;
}

export interface IdempotentOperationInput<TBody> {
  readonly org_id: string;
  readonly credential_id: string;
  readonly operation: string;
  readonly idempotency_key: string;
  readonly request_fingerprint: string;
  readonly repo: IdempotencyRepo;
  readonly now?: Date;
  readonly ttlMs?: number;
  readonly execute: () => Promise<{
    readonly status: number;
    readonly body: TBody;
    readonly resource_type?: string;
    readonly resource_id?: string;
  }>;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
    .join(",")}}`;
}

export function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

export function fingerprintRequest(input: {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}): string {
  return sha256(
    canonicalJson({
      method: input.method.toUpperCase(),
      path: input.path,
      body: input.body,
    }),
  );
}

export async function runIdempotently<TBody>(
  input: IdempotentOperationInput<TBody>,
): Promise<{ readonly status: number; readonly body: unknown; readonly replayed: boolean }> {
  const now = input.now ?? new Date();
  const existing = await input.repo.find(input.org_id, input.operation, input.idempotency_key, now);
  if (existing) {
    if (existing.request_fingerprint !== input.request_fingerprint) {
      throw conflict("Idempotency-Key was already used with a different request body.");
    }
    return { status: existing.response_status, body: existing.response_body, replayed: true };
  }

  const result = await input.execute();
  await input.repo.insert({
    org_id: input.org_id,
    credential_id: input.credential_id,
    operation: input.operation,
    idempotency_key: input.idempotency_key,
    request_fingerprint: input.request_fingerprint,
    response_status: result.status,
    response_body: result.body,
    response_body_hash: sha256(canonicalJson(result.body)),
    ...(result.resource_type ? { resource_type: result.resource_type } : {}),
    ...(result.resource_id ? { resource_id: result.resource_id } : {}),
    expires_at: new Date(now.getTime() + (input.ttlMs ?? 24 * 60 * 60 * 1000)),
  });

  return { ...result, replayed: false };
}
