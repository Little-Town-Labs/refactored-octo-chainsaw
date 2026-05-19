import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import type { AuditLogEventRow, TranscriptTurnRow } from "@spyglass/db";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "../src/writer.js";
import {
  appendTranscriptTurn,
  type InsertTranscriptTurnRow,
  type TranscriptStore,
  type TranscriptWriterTx,
} from "../src/transcripts.js";

const SAMPLE_COUNT = 500;
const THRESHOLD_MS = 200;
const MATCH_ID = "44444444-4444-4444-8444-444444444444";
const RUN_ID = "55555555-5555-4555-8555-555555555555";
const PRINCIPAL_ID = "22222222-2222-4222-8222-222222222222";

const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const outPath =
  outArg?.slice("--out=".length) ??
  `.specify/specs/05-audit-log-tombstone/quickstart-run-${new Date()
    .toISOString()
    .slice(0, 10)}.md`;
const outputPath = resolve(process.env.INIT_CWD ?? process.cwd(), outPath);

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

function percentile(sorted: readonly number[], pct: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * pct) - 1);
  return sorted[index] ?? 0;
}

function uuidFor(value: number): string {
  return `77777777-7777-4777-8777-${value.toString().padStart(12, "0")}`;
}

async function main(): Promise<void> {
  const store = new MemoryTranscriptStore();
  const samples: number[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const started = performance.now();
    await appendTranscriptTurn(store, {
      transcriptTurnId: uuidFor(i + 1),
      matchTicketId: MATCH_ID,
      runId: RUN_ID,
      side: i % 2 === 0 ? "seeker" : "employer",
      turnIndex: Math.floor(i / 2),
      contractId: "contract-a",
      contractVersion: "v1",
      rubricId: "rubric-a",
      rubricVersion: "v1",
      modelRef: "openai/gpt-5.4-mini",
      toolCallRefs: [`tool-call-${i}`],
      content: { text: `turn ${i}`, token_count: i + 10 },
      principalId: PRINCIPAL_ID,
      principalKind: "agent",
      roleOrScope: "transcript.append",
      correlationId: `corr-transcript-bench-${i}`,
      createdAt: new Date(Date.UTC(2026, 4, 19, 12, 0, 0, i)),
    });
    samples.push(performance.now() - started);
  }

  samples.sort((a, b) => a - b);
  const p90 = percentile(samples, 0.9);
  const passed = p90 < THRESHOLD_MS;

  const report = [
    "",
    "## T016 transcript append benchmark",
    "",
    `- turns_appended: ${SAMPLE_COUNT}`,
    `- p90_append_ms: ${p90.toFixed(2)}`,
    `- threshold_ms: ${THRESHOLD_MS}`,
    `- linked_audit_events: ${store.auditRows.length}`,
    `- result: ${passed ? "PASS" : "FAIL"}`,
    "",
  ].join("\n");

  mkdirSync(dirname(outputPath), { recursive: true });
  appendFileSync(outputPath, report);
  console.log(report);

  if (!passed || store.auditRows.length !== SAMPLE_COUNT) process.exit(1);
}

await main();
