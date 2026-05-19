import { auditEventsBuffer, auditLogEvents, type AuditLogEventRow, type Db } from "@spyglass/db";
import { and, asc, eq } from "drizzle-orm";

import {
  appendCanonicalAuditEvent,
  type CanonicalAuditPayload,
  type CanonicalAuditWriterStore,
} from "./writer.js";
import { createDrizzleCanonicalAuditWriterStore } from "./writer.js";

export interface BufferedAuditEvent {
  readonly event_id: string;
  readonly event_name: string;
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly role_or_scope: string | null;
  readonly correlation_id: string;
  readonly payload: CanonicalAuditPayload;
  readonly created_at: Date;
}

export interface AuditReplayStore extends CanonicalAuditWriterStore {
  listBufferedEvents(): Promise<readonly BufferedAuditEvent[]>;
  findCanonicalEventBySource(
    sourceTable: string,
    sourceEventId: string,
  ): Promise<AuditLogEventRow | null>;
}

export interface ReplayResult {
  readonly scanned: number;
  readonly inserted: number;
  readonly skipped: number;
}

const SOURCE_TABLE = "audit_events_buffer";

export async function replayAuditEventsBuffer(store: AuditReplayStore): Promise<ReplayResult> {
  const bufferedEvents = await store.listBufferedEvents();
  let inserted = 0;
  let skipped = 0;

  for (const event of bufferedEvents) {
    const existing = await store.findCanonicalEventBySource(SOURCE_TABLE, event.event_id);
    if (existing) {
      skipped += 1;
      continue;
    }

    await appendCanonicalAuditEvent(store, {
      sourceTable: SOURCE_TABLE,
      sourceEventId: event.event_id,
      eventName: event.event_name,
      principalId: event.principal_id,
      principalKind: event.principal_kind,
      roleOrScope: event.role_or_scope,
      correlationId: event.correlation_id,
      payload: event.payload,
      createdAt: event.created_at,
    });
    inserted += 1;
  }

  return { scanned: bufferedEvents.length, inserted, skipped };
}

export function createDrizzleAuditReplayStore(db: Db): AuditReplayStore {
  const writerStore = createDrizzleCanonicalAuditWriterStore(db);
  return {
    transaction: writerStore.transaction,
    async listBufferedEvents() {
      const rows = await db
        .select({
          event_id: auditEventsBuffer.event_id,
          event_name: auditEventsBuffer.event_name,
          principal_id: auditEventsBuffer.principal_id,
          principal_kind: auditEventsBuffer.principal_kind,
          role_or_scope: auditEventsBuffer.role_or_scope,
          correlation_id: auditEventsBuffer.correlation_id,
          payload: auditEventsBuffer.payload,
          created_at: auditEventsBuffer.created_at,
        })
        .from(auditEventsBuffer)
        .orderBy(asc(auditEventsBuffer.created_at), asc(auditEventsBuffer.event_id));

      return rows.map((row) => ({
        ...row,
        principal_kind: asPrincipalKind(row.principal_kind),
        payload: row.payload as CanonicalAuditPayload,
      }));
    },
    async findCanonicalEventBySource(sourceTable, sourceEventId) {
      const rows = await db
        .select()
        .from(auditLogEvents)
        .where(
          and(
            eq(auditLogEvents.source_table, sourceTable),
            eq(auditLogEvents.source_event_id, sourceEventId),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },
  };
}

function asPrincipalKind(value: string): "human" | "agent" | "service" {
  if (value === "human" || value === "agent" || value === "service") return value;
  throw new Error(`invalid principal_kind in audit_events_buffer: ${value}`);
}
