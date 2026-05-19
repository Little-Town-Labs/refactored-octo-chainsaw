import type { CanonicalAuditWriterStore, CanonicalAuditWriterTx } from "@spyglass/audit-log";
import type { AuditEventSink } from "@spyglass/auth";
import type { AuditLogEventRow, Db } from "@spyglass/db";
import * as schema from "@spyglass/db";
import { drizzle } from "drizzle-orm/pg-proxy";

import { createCanonicalDrizzleAuditSink } from "../audit-sink-canonical-db";
import type { InsertCanonicalAuditEventRow } from "@spyglass/audit-log";

interface CapturedQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

class MemoryWriterStore implements CanonicalAuditWriterStore {
  readonly inserted: InsertCanonicalAuditEventRow[] = [];

  async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
    const tx: CanonicalAuditWriterTx = {
      lockChainNamespace: async () => {},
      getLastEventHash: async () => this.inserted.at(-1)?.event_hash ?? null,
      insertEvent: async (row) => {
        this.inserted.push(row);
        return row as unknown as AuditLogEventRow;
      },
    };
    return fn(tx);
  }
}

function makeFakeDb(rowsBySql: (sql: string) => unknown[][]) {
  const captured: CapturedQuery[] = [];
  const db = drizzle(
    async (sql, params) => {
      captured.push({ sql, params });
      return { rows: rowsBySql(sql) };
    },
    { schema },
  ) as unknown as Db;
  return { db, captured };
}

function makeFallback() {
  const events: Array<Parameters<AuditEventSink["emit"]>[0]> = [];
  const sink: AuditEventSink = {
    async emit(e) {
      events.push(e);
    },
  };
  return { sink, events };
}

const PID = "00000000-0000-0000-0000-00000000a001";

describe("createCanonicalDrizzleAuditSink", () => {
  it("writes emitted events to canonical audit rows with principal kind + role", async () => {
    const { db } = makeFakeDb((sql) => {
      if (/from "principals"/i.test(sql)) return [["human", "operator"]];
      return [];
    });
    const writerStore = new MemoryWriterStore();
    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createCanonicalDrizzleAuditSink(db, { fallback, writerStore });

    await sink.emit({
      name: "agent_credential.issued_by_operator",
      principal_id: PID,
      correlation_id: "c-1",
      payload: { credential_id: "cid-1" },
    });

    expect(fallbackEvents).toHaveLength(0);
    expect(writerStore.inserted).toHaveLength(1);
    expect(writerStore.inserted[0]).toMatchObject({
      event_name: "agent_credential.issued_by_operator",
      principal_id: PID,
      principal_kind: "human",
      role_or_scope: "operator",
      correlation_id: "c-1",
      payload: { credential_id: "cid-1" },
      chain_namespace: "default",
      hash_algorithm: "sha256",
      canonicalization_version: "v1",
    });
  });

  it("falls back when there is no principal_id", async () => {
    const { db } = makeFakeDb(() => []);
    const writerStore = new MemoryWriterStore();
    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createCanonicalDrizzleAuditSink(db, { fallback, writerStore });

    await sink.emit({
      name: "service_credential.rejected_vercel_oidc",
      correlation_id: "c-2",
      payload: { token_kind: "vercel_oidc" },
    });

    expect(fallbackEvents).toHaveLength(1);
    expect(writerStore.inserted).toHaveLength(0);
  });
});
