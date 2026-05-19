import type { AuditLogEventRow } from "@spyglass/db";

import {
  replayAuditEventsBuffer,
  type AuditReplayStore,
  type BufferedAuditEvent,
} from "../replay.js";
import type { CanonicalAuditWriterTx, InsertCanonicalAuditEventRow } from "../writer.js";

const PRINCIPAL_ID = "22222222-2222-4222-8222-222222222222";

class MemoryReplayStore implements AuditReplayStore {
  readonly canonicalRows: AuditLogEventRow[] = [];
  constructor(private readonly bufferedRows: BufferedAuditEvent[]) {}

  async listBufferedEvents(): Promise<readonly BufferedAuditEvent[]> {
    return this.bufferedRows;
  }

  async findCanonicalEventBySource(
    sourceTable: string,
    sourceEventId: string,
  ): Promise<AuditLogEventRow | null> {
    return (
      this.canonicalRows.find(
        (row) => row.source_table === sourceTable && row.source_event_id === sourceEventId,
      ) ?? null
    );
  }

  async transaction<T>(fn: (tx: CanonicalAuditWriterTx) => Promise<T>): Promise<T> {
    const tx: CanonicalAuditWriterTx = {
      lockChainNamespace: async () => {},
      getLastEventHash: async (chainNamespace) =>
        this.canonicalRows.filter((row) => row.chain_namespace === chainNamespace).at(-1)
          ?.event_hash ?? null,
      insertEvent: async (row) => {
        if (
          this.canonicalRows.some(
            (existing) =>
              existing.source_table === row.source_table &&
              existing.source_event_id === row.source_event_id,
          )
        ) {
          throw new Error("duplicate source replay");
        }
        const inserted = toAuditLogEventRow(row);
        this.canonicalRows.push(inserted);
        return inserted;
      },
    };
    return fn(tx);
  }
}

describe("replayAuditEventsBuffer", () => {
  test("replays buffered audit rows exactly once", async () => {
    const store = new MemoryReplayStore([buffered("11111111-1111-4111-8111-111111111111")]);

    expect(await replayAuditEventsBuffer(store)).toEqual({
      scanned: 1,
      inserted: 1,
      skipped: 0,
    });
    expect(await replayAuditEventsBuffer(store)).toEqual({
      scanned: 1,
      inserted: 0,
      skipped: 1,
    });
    expect(store.canonicalRows).toHaveLength(1);
    expect(store.canonicalRows[0]?.source_table).toBe("audit_events_buffer");
    expect(store.canonicalRows[0]?.source_event_id).toBe("11111111-1111-4111-8111-111111111111");
  });
});

function buffered(eventId: string): BufferedAuditEvent {
  return {
    event_id: eventId,
    event_name: "ticket.transition",
    principal_id: PRINCIPAL_ID,
    principal_kind: "human",
    role_or_scope: "operator",
    correlation_id: `corr-${eventId.slice(0, 8)}`,
    payload: { action: "submitted" },
    created_at: new Date("2026-05-19T12:00:00.000Z"),
  };
}

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
