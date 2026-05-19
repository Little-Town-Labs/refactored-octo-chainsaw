import {
  transcriptTurns,
  type AuditLogEventRow,
  type Db,
  type NewTranscriptTurnRow,
  type TranscriptTurnRow,
} from "@spyglass/db";
import { asc, eq } from "drizzle-orm";

import {
  appendCanonicalAuditEvent,
  canonicalizeJson,
  computePayloadHash,
  createDrizzleCanonicalAuditWriterTx,
  type AppendCanonicalAuditEventInput,
  type CanonicalAuditWriterStore,
} from "./writer.js";

export type TranscriptSide = "seeker" | "employer";

export interface AppendTranscriptTurnInput {
  readonly transcriptTurnId?: string;
  readonly matchTicketId: string;
  readonly runId: string;
  readonly side: TranscriptSide;
  readonly turnIndex: number;
  readonly contractId?: string | null;
  readonly contractVersion?: string | null;
  readonly rubricId?: string | null;
  readonly rubricVersion?: string | null;
  readonly modelRef?: string | null;
  readonly toolCallRefs?: readonly string[];
  readonly content: Record<string, unknown>;
  readonly principalId: string;
  readonly principalKind: "human" | "agent" | "service";
  readonly roleOrScope?: string | null;
  readonly correlationId: string;
  readonly createdAt?: Date;
}

export interface InsertTranscriptTurnRow {
  readonly transcript_turn_id?: string;
  readonly match_ticket_id: string;
  readonly run_id: string;
  readonly side: TranscriptSide;
  readonly turn_index: number;
  readonly contract_id: string | null;
  readonly contract_version: string | null;
  readonly rubric_id: string | null;
  readonly rubric_version: string | null;
  readonly model_ref: string | null;
  readonly tool_call_refs: readonly string[];
  readonly content: Record<string, unknown>;
  readonly content_hash: string;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export interface TranscriptWriterTx {
  appendAuditEvent(input: AppendCanonicalAuditEventInput): Promise<AuditLogEventRow>;
  insertTranscriptTurn(row: InsertTranscriptTurnRow): Promise<TranscriptTurnRow>;
  listTranscriptTurns(matchTicketId: string): Promise<readonly TranscriptTurnRow[]>;
}

export interface TranscriptStore {
  transaction<T>(fn: (tx: TranscriptWriterTx) => Promise<T>): Promise<T>;
}

export interface TranscriptReadAuth {
  readonly scopes: readonly string[];
}

export async function appendTranscriptTurn(
  store: TranscriptStore,
  input: AppendTranscriptTurnInput,
): Promise<TranscriptTurnRow> {
  const createdAt = input.createdAt ?? new Date();
  return store.transaction(async (tx) => {
    const contentHash = computePayloadHash(input.content);
    const auditEvent = await tx.appendAuditEvent({
      eventName: "transcript_turn.appended",
      principalId: input.principalId,
      principalKind: input.principalKind,
      roleOrScope: input.roleOrScope ?? null,
      correlationId: input.correlationId,
      payload: {
        match_ticket_id: input.matchTicketId,
        run_id: input.runId,
        side: input.side,
        turn_index: input.turnIndex,
        content_hash: contentHash,
      },
      chainNamespace: "transcript",
      createdAt,
    });

    return tx.insertTranscriptTurn({
      ...(input.transcriptTurnId ? { transcript_turn_id: input.transcriptTurnId } : {}),
      match_ticket_id: input.matchTicketId,
      run_id: input.runId,
      side: input.side,
      turn_index: input.turnIndex,
      contract_id: input.contractId ?? null,
      contract_version: input.contractVersion ?? null,
      rubric_id: input.rubricId ?? null,
      rubric_version: input.rubricVersion ?? null,
      model_ref: input.modelRef ?? null,
      tool_call_refs: [...(input.toolCallRefs ?? [])],
      content: JSON.parse(canonicalizeJson(input.content)) as Record<string, unknown>,
      content_hash: contentHash,
      audit_event_id: auditEvent.audit_event_id,
      created_at: createdAt,
    });
  });
}

export async function readTranscriptTurns(
  store: TranscriptStore,
  matchTicketId: string,
  auth: TranscriptReadAuth,
): Promise<readonly TranscriptTurnRow[]> {
  if (!canReadTranscript(auth.scopes)) {
    throw new Error("transcript read denied: missing transcript.read or audit.read scope");
  }
  return store.transaction((tx) => tx.listTranscriptTurns(matchTicketId));
}

export function createTranscriptStoreFromAuditWriter(
  auditWriter: CanonicalAuditWriterStore,
): TranscriptStore {
  return {
    transaction<T>(fn: (tx: TranscriptWriterTx) => Promise<T>): Promise<T> {
      return auditWriter.transaction((auditTx) =>
        fn({
          appendAuditEvent: (input) =>
            appendCanonicalAuditEvent({ transaction: (inner) => inner(auditTx) }, input),
          insertTranscriptTurn: async () => {
            throw new Error("transcript insert requires a concrete transcript store adapter");
          },
          listTranscriptTurns: async () => {
            throw new Error("transcript read requires a concrete transcript store adapter");
          },
        }),
      );
    },
  };
}

export function createDrizzleTranscriptStore(db: Db): TranscriptStore {
  return {
    transaction<T>(fn: (tx: TranscriptWriterTx) => Promise<T>): Promise<T> {
      return db.transaction(async (dbTx) => {
        const scopedDb = dbTx as unknown as Db;
        const auditTx = createDrizzleCanonicalAuditWriterTx(scopedDb);
        return fn({
          appendAuditEvent: (input) =>
            appendCanonicalAuditEvent({ transaction: (inner) => inner(auditTx) }, input),
          async insertTranscriptTurn(row) {
            const [inserted] = await scopedDb
              .insert(transcriptTurns)
              .values(toDrizzleInsert(row))
              .returning();
            if (!inserted) throw new Error("failed to insert transcript turn");
            return inserted;
          },
          async listTranscriptTurns(matchTicketId) {
            return scopedDb
              .select()
              .from(transcriptTurns)
              .where(eq(transcriptTurns.match_ticket_id, matchTicketId))
              .orderBy(asc(transcriptTurns.side), asc(transcriptTurns.turn_index));
          },
        });
      });
    },
  };
}

function canReadTranscript(scopes: readonly string[]): boolean {
  return scopes.includes("transcript.read") || scopes.includes("audit.read");
}

function toDrizzleInsert(row: InsertTranscriptTurnRow): NewTranscriptTurnRow {
  return {
    ...(row.transcript_turn_id ? { transcript_turn_id: row.transcript_turn_id } : {}),
    match_ticket_id: row.match_ticket_id,
    run_id: row.run_id,
    side: row.side,
    turn_index: row.turn_index,
    contract_id: row.contract_id,
    contract_version: row.contract_version,
    rubric_id: row.rubric_id,
    rubric_version: row.rubric_version,
    model_ref: row.model_ref,
    tool_call_refs: [...row.tool_call_refs],
    content: row.content,
    content_hash: row.content_hash,
    audit_event_id: row.audit_event_id,
    created_at: row.created_at,
  };
}
