import type { AuditLogEventRow, TranscriptTurnRow } from "@spyglass/db";

import {
  appendTranscriptTurn,
  readTranscriptTurns,
  type AppendTranscriptTurnInput,
  type InsertTranscriptTurnRow,
  type TranscriptStore,
  type TranscriptWriterTx,
} from "../transcripts.js";
import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "../writer.js";

const MATCH_ID = "44444444-4444-4444-8444-444444444444";
const RUN_ID = "55555555-5555-4555-8555-555555555555";
const PRINCIPAL_ID = "22222222-2222-4222-8222-222222222222";

class MemoryTranscriptStore implements TranscriptStore {
  readonly turns: TranscriptTurnRow[] = [];
  readonly auditRows: AuditLogEventRow[] = [];

  private readonly auditWriter: CanonicalAuditWriterStore = {
    transaction: async (fn) =>
      fn({
        lockChainNamespace: async () => {},
        getLastEventHash: async () => this.auditRows.at(-1)?.event_hash ?? null,
        insertEvent: async (row) => {
          const auditRow = row as unknown as AuditLogEventRow;
          this.auditRows.push(auditRow);
          return auditRow;
        },
      }),
  };

  async transaction<T>(fn: (tx: TranscriptWriterTx) => Promise<T>): Promise<T> {
    const tx: TranscriptWriterTx = {
      appendAuditEvent: async (input) => appendCanonicalAuditEvent(this.auditWriter, input),
      insertTranscriptTurn: async (row) => {
        if (
          this.turns.some(
            (turn) =>
              turn.run_id === row.run_id &&
              turn.side === row.side &&
              turn.turn_index === row.turn_index,
          )
        ) {
          throw new Error("duplicate transcript turn");
        }
        const inserted = toTranscriptTurnRow(row);
        this.turns.push(inserted);
        return inserted;
      },
      listTranscriptTurns: async (matchTicketId) =>
        this.turns.filter((turn) => turn.match_ticket_id === matchTicketId),
    };
    return fn(tx);
  }
}

describe("transcript primitives", () => {
  test("append stores a transcript turn and links an audit event", async () => {
    const store = new MemoryTranscriptStore();

    const row = await appendTranscriptTurn(store, transcriptInput());

    expect(row.match_ticket_id).toBe(MATCH_ID);
    expect(row.audit_event_id).toBeDefined();
    expect(store.auditRows).toHaveLength(1);
    expect(store.auditRows[0]?.event_name).toBe("transcript_turn.appended");
  });

  test("duplicate run/side/turn index is rejected without overwriting the first turn", async () => {
    const store = new MemoryTranscriptStore();
    await appendTranscriptTurn(store, transcriptInput());

    await expect(appendTranscriptTurn(store, transcriptInput())).rejects.toThrow(/duplicate/i);
    expect(store.turns).toHaveLength(1);
  });

  test("raw transcript reads require transcript or audit scope", async () => {
    const store = new MemoryTranscriptStore();
    await appendTranscriptTurn(store, transcriptInput());

    await expect(readTranscriptTurns(store, MATCH_ID, { scopes: [] })).rejects.toThrow(/denied/i);
    await expect(
      readTranscriptTurns(store, MATCH_ID, { scopes: ["transcript.read"] }),
    ).resolves.toHaveLength(1);
  });
});

function transcriptInput(
  overrides: Partial<AppendTranscriptTurnInput> = {},
): AppendTranscriptTurnInput {
  return {
    transcriptTurnId: "66666666-6666-4666-8666-666666666666",
    matchTicketId: MATCH_ID,
    runId: RUN_ID,
    side: "seeker",
    turnIndex: 0,
    contractId: "contract-a",
    contractVersion: "v1",
    rubricId: "rubric-a",
    rubricVersion: "v1",
    modelRef: "openai/gpt-5.4-mini",
    toolCallRefs: ["tool-call-1"],
    content: { text: "hello" },
    principalId: PRINCIPAL_ID,
    principalKind: "agent",
    roleOrScope: "transcript.append",
    correlationId: "corr-transcript-1",
    createdAt: new Date("2026-05-19T12:00:00.000Z"),
    ...overrides,
  };
}

function toTranscriptTurnRow(row: InsertTranscriptTurnRow): TranscriptTurnRow {
  return {
    transcript_turn_id: row.transcript_turn_id ?? "00000000-0000-4000-8000-000000000000",
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
    tombstoned_at: null,
  };
}
