import type { AuditLogEventRow } from "@spyglass/db";

import { verifyHashChain } from "../hash-chain.js";
import {
  appendCanonicalAuditEvent,
  canonicalizeJson,
  type CanonicalAuditWriterStore,
  type CanonicalAuditWriterTx,
  type InsertCanonicalAuditEventRow,
} from "../writer.js";

const PRINCIPAL_ID = "22222222-2222-4222-8222-222222222222";

class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let releaseCurrent!: () => void;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const previous = this.tail;
    this.tail = previous.then(() => current);
    await previous;
    return releaseCurrent;
  }
}

class MemoryCanonicalAuditStore implements CanonicalAuditWriterStore {
  readonly rows: AuditLogEventRow[] = [];
  private readonly locks = new Map<string, Mutex>();

  async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
    const releases: Array<() => void> = [];
    const tx: CanonicalAuditWriterTx = {
      lockChainNamespace: async (chainNamespace) => {
        const mutex = this.locks.get(chainNamespace) ?? new Mutex();
        this.locks.set(chainNamespace, mutex);
        releases.push(await mutex.acquire());
      },
      getLastEventHash: async (chainNamespace) =>
        this.rows.filter((row) => row.chain_namespace === chainNamespace).at(-1)?.event_hash ??
        null,
      insertEvent: async (row) => {
        const inserted = toAuditLogEventRow(row);
        this.rows.push(inserted);
        return inserted;
      },
    };

    try {
      return await fn(tx);
    } finally {
      for (const release of releases.reverse()) release();
    }
  }
}

describe("appendCanonicalAuditEvent", () => {
  test("canonical JSON payload serialization is stable", () => {
    expect(canonicalizeJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalizeJson({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  test("append emits valid chain links", async () => {
    const store = new MemoryCanonicalAuditStore();

    const first = await appendCanonicalAuditEvent(store, {
      auditEventId: "11111111-1111-4111-8111-111111111111",
      eventName: "ticket.transition",
      principalId: PRINCIPAL_ID,
      principalKind: "human",
      roleOrScope: "operator",
      correlationId: "corr-001",
      payload: { action: "submitted" },
      createdAt: new Date("2026-05-19T12:00:00.000Z"),
    });
    const second = await appendCanonicalAuditEvent(store, {
      auditEventId: "33333333-3333-4333-8333-333333333333",
      eventName: "ticket.transition",
      principalId: PRINCIPAL_ID,
      principalKind: "human",
      roleOrScope: "operator",
      correlationId: "corr-002",
      payload: { action: "matched" },
      createdAt: new Date("2026-05-19T12:00:01.000Z"),
    });

    expect(first.previous_hash).toBeNull();
    expect(second.previous_hash).toBe(first.event_hash);
    expect(verifyHashChain(toHashRows(store.rows))).toEqual({ ok: true });
  });

  test("concurrent appends to one namespace are serialized", async () => {
    const store = new MemoryCanonicalAuditStore();

    await Promise.all([
      appendCanonicalAuditEvent(store, {
        auditEventId: "11111111-1111-4111-8111-111111111111",
        eventName: "ticket.transition",
        principalId: PRINCIPAL_ID,
        principalKind: "human",
        correlationId: "corr-001",
        payload: { sequence: 1 },
        createdAt: new Date("2026-05-19T12:00:00.000Z"),
      }),
      appendCanonicalAuditEvent(store, {
        auditEventId: "33333333-3333-4333-8333-333333333333",
        eventName: "ticket.transition",
        principalId: PRINCIPAL_ID,
        principalKind: "human",
        correlationId: "corr-002",
        payload: { sequence: 2 },
        createdAt: new Date("2026-05-19T12:00:01.000Z"),
      }),
    ]);

    expect(store.rows).toHaveLength(2);
    expect(store.rows[1]?.previous_hash).toBe(store.rows[0]?.event_hash);
    expect(verifyHashChain(toHashRows(store.rows))).toEqual({ ok: true });
  });
});

function toAuditLogEventRow(row: InsertCanonicalAuditEventRow): AuditLogEventRow {
  return {
    audit_event_id: row.audit_event_id ?? "00000000-0000-4000-8000-000000000000",
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
    tombstoned_at: null,
  };
}

function toHashRows(rows: readonly AuditLogEventRow[]) {
  return rows.map((row) => ({
    auditEventId: row.audit_event_id,
    eventName: row.event_name,
    principalId: row.principal_id,
    principalKind: row.principal_kind as "human" | "agent" | "service",
    roleOrScope: row.role_or_scope,
    correlationId: row.correlation_id,
    payloadHash: row.payload_hash,
    previousHash: row.previous_hash,
    chainNamespace: row.chain_namespace,
    hashAlgorithm: row.hash_algorithm as "sha256",
    canonicalizationVersion: row.canonicalization_version,
    createdAt: row.created_at.toISOString(),
    eventHash: row.event_hash,
  }));
}
