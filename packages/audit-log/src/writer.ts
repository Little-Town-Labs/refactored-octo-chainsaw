import { createHash, randomUUID } from "node:crypto";

import {
  auditLogEvents,
  type AuditLogEventRow,
  type Db,
  type NewAuditLogEventRow,
} from "@spyglass/db";
import { desc, eq, sql } from "drizzle-orm";

import { computeEventHash, type AuditEventHashMaterial } from "./hash-chain.js";

export type CanonicalAuditPayload = Record<string, unknown>;

export interface AppendCanonicalAuditEventInput {
  readonly auditEventId?: string;
  readonly sourceTable?: string | null;
  readonly sourceEventId?: string | null;
  readonly eventName: string;
  readonly principalId: string;
  readonly principalKind: "human" | "agent" | "service";
  readonly roleOrScope?: string | null;
  readonly correlationId: string;
  readonly payload: CanonicalAuditPayload;
  readonly chainNamespace?: string;
  readonly createdAt?: Date;
}

export interface InsertCanonicalAuditEventRow {
  readonly audit_event_id?: string;
  readonly source_table: string | null;
  readonly source_event_id: string | null;
  readonly event_name: string;
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly role_or_scope: string | null;
  readonly correlation_id: string;
  readonly payload: CanonicalAuditPayload;
  readonly payload_hash: string;
  readonly previous_hash: string | null;
  readonly event_hash: string;
  readonly chain_namespace: string;
  readonly hash_algorithm: "sha256";
  readonly canonicalization_version: string;
  readonly created_at: Date;
}

export interface CanonicalAuditWriterTx {
  lockChainNamespace(chainNamespace: string): Promise<void>;
  getLastEventHash(chainNamespace: string): Promise<string | null>;
  insertEvent(row: InsertCanonicalAuditEventRow): Promise<AuditLogEventRow>;
}

export interface CanonicalAuditWriterStore {
  transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T>;
}

const DEFAULT_CHAIN_NAMESPACE = "default";
const CANONICALIZATION_VERSION = "v1";

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function computePayloadHash(payload: CanonicalAuditPayload): string {
  return createHash("sha256").update(canonicalizeJson(payload)).digest("hex");
}

export async function appendCanonicalAuditEvent(
  store: CanonicalAuditWriterStore,
  input: AppendCanonicalAuditEventInput,
): Promise<AuditLogEventRow> {
  const chainNamespace = input.chainNamespace ?? DEFAULT_CHAIN_NAMESPACE;
  const createdAt = input.createdAt ?? new Date();
  const auditEventId = input.auditEventId ?? randomUUID();

  return store.transaction(async (tx) => {
    await tx.lockChainNamespace(chainNamespace);
    const previousHash = await tx.getLastEventHash(chainNamespace);
    const payloadHash = computePayloadHash(input.payload);
    const hashMaterial: AuditEventHashMaterial = {
      auditEventId,
      eventName: input.eventName,
      principalId: input.principalId,
      principalKind: input.principalKind,
      roleOrScope: input.roleOrScope ?? null,
      correlationId: input.correlationId,
      payloadHash,
      previousHash,
      chainNamespace,
      hashAlgorithm: "sha256",
      canonicalizationVersion: CANONICALIZATION_VERSION,
      createdAt: createdAt.toISOString(),
    };

    const eventHash = computeEventHash(hashMaterial);
    return tx.insertEvent({
      audit_event_id: auditEventId,
      source_table: input.sourceTable ?? null,
      source_event_id: input.sourceEventId ?? null,
      event_name: input.eventName,
      principal_id: input.principalId,
      principal_kind: input.principalKind,
      role_or_scope: input.roleOrScope ?? null,
      correlation_id: input.correlationId,
      payload: input.payload,
      payload_hash: payloadHash,
      previous_hash: previousHash,
      event_hash: eventHash,
      chain_namespace: chainNamespace,
      hash_algorithm: "sha256",
      canonicalization_version: CANONICALIZATION_VERSION,
      created_at: createdAt,
    });
  });
}

export function createDrizzleCanonicalAuditWriterStore(db: Db): CanonicalAuditWriterStore {
  return {
    async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
      return db.transaction(async (tx) =>
        fn(createDrizzleCanonicalAuditWriterTx(tx as unknown as Db)),
      );
    },
  };
}

export function createDrizzleCanonicalAuditWriterTx(db: Db): CanonicalAuditWriterTx {
  return {
    async lockChainNamespace(chainNamespace) {
      await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${chainNamespace}, 0))`);
    },
    async getLastEventHash(chainNamespace) {
      const rows = await db
        .select({ event_hash: auditLogEvents.event_hash })
        .from(auditLogEvents)
        .where(eq(auditLogEvents.chain_namespace, chainNamespace))
        .orderBy(desc(auditLogEvents.created_at), desc(auditLogEvents.audit_event_id))
        .limit(1);
      return rows[0]?.event_hash ?? null;
    },
    async insertEvent(row) {
      const [inserted] = await db.insert(auditLogEvents).values(toDrizzleInsert(row)).returning();
      if (!inserted) throw new Error("failed to insert canonical audit event");
      return inserted;
    },
  };
}

function toDrizzleInsert(row: InsertCanonicalAuditEventRow): NewAuditLogEventRow {
  return {
    ...(row.audit_event_id ? { audit_event_id: row.audit_event_id } : {}),
    source_table: row.source_table,
    source_event_id: row.source_event_id,
    event_name: row.event_name,
    principal_id: row.principal_id,
    principal_kind: row.principal_kind,
    role_or_scope: row.role_or_scope,
    correlation_id: row.correlation_id,
    payload: row.payload,
    payload_hash: row.payload_hash,
    previous_hash: row.previous_hash,
    event_hash: row.event_hash,
    chain_namespace: row.chain_namespace,
    hash_algorithm: row.hash_algorithm,
    canonicalization_version: row.canonicalization_version,
    created_at: row.created_at,
  };
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value === null || typeof value !== "object") return value;

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortJson((value as Record<string, unknown>)[key]);
  }
  return sorted;
}
