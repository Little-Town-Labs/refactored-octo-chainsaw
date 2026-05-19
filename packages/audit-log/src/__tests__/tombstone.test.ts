import type { AuditLogEventRow, TombstoneRecordRow, TranscriptTurnRow } from "@spyglass/db";

import { computeEventHash, verifyHashChain } from "../hash-chain.js";
import {
  executeTombstone,
  type ExecuteTombstoneInput,
  type TombstoneStore,
  type TombstoneTargetRef,
  type TombstoneTx,
} from "../tombstone.js";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const TRANSCRIPT_ID = "22222222-2222-4222-8222-222222222222";
const OPERATOR_ID = "33333333-3333-4333-8333-333333333333";

class MemoryTombstoneStore implements TombstoneStore {
  auditEvent = auditEvent();
  transcriptTurn = transcriptTurn();
  readonly tombstoneAuditEvents: AuditLogEventRow[] = [];
  readonly tombstones: TombstoneRecordRow[] = [];
  readonly legalHolds = new Set<string>();

  async transaction<T>(fn: (tx: TombstoneTx) => Promise<T>): Promise<T> {
    const tx: TombstoneTx = {
      resolveTargets: async () => [
        { kind: "audit_event", id: AUDIT_ID },
        { kind: "transcript_turn", id: TRANSCRIPT_ID },
      ],
      getAuditEvent: async (id) => (id === this.auditEvent.audit_event_id ? this.auditEvent : null),
      getTranscriptTurn: async (id) =>
        id === this.transcriptTurn.transcript_turn_id ? this.transcriptTurn : null,
      hasTombstone: async (target) =>
        this.tombstones.some(
          (row) => row.target_kind === target.kind && row.target_id === target.id,
        ),
      hasLegalHold: async (target) => this.legalHolds.has(key(target)),
      appendTombstoneAuditEvent: async (input) => {
        const row = {
          audit_event_id: `99999999-9999-4999-8999-${(this.tombstoneAuditEvents.length + 1)
            .toString()
            .padStart(12, "0")}`,
          source_table: input.sourceTable ?? null,
          source_event_id: input.sourceEventId ?? null,
          event_name: input.eventName,
          principal_id: input.principalId,
          principal_kind: input.principalKind,
          role_or_scope: input.roleOrScope ?? null,
          correlation_id: input.correlationId,
          payload: input.payload,
          payload_hash: "e".repeat(64),
          previous_hash: null,
          event_hash: "f".repeat(64),
          chain_namespace: input.chainNamespace ?? "tombstone",
          hash_algorithm: "sha256",
          canonicalization_version: "v1",
          created_at: input.createdAt ?? new Date("2026-05-19T12:00:00.000Z"),
          tombstoned_at: null,
        } satisfies AuditLogEventRow;
        this.tombstoneAuditEvents.push(row);
        return row;
      },
      updateAuditEventTombstone: async (id, payload, at) => {
        if (id !== this.auditEvent.audit_event_id) throw new Error("audit event not found");
        this.auditEvent = { ...this.auditEvent, payload, tombstoned_at: at };
      },
      updateTranscriptTurnTombstone: async (id, at) => {
        if (id !== this.transcriptTurn.transcript_turn_id) throw new Error("transcript not found");
        this.transcriptTurn = { ...this.transcriptTurn, content: null, tombstoned_at: at };
      },
      insertTombstoneRecord: async (record) => {
        const row: TombstoneRecordRow = {
          tombstone_id: `44444444-4444-4444-8444-${(this.tombstones.length + 1)
            .toString()
            .padStart(12, "0")}`,
          ...record,
          created_at: record.created_at ?? new Date("2026-05-19T12:00:00.000Z"),
        };
        this.tombstones.push(row);
        return row;
      },
    };
    return fn(tx);
  }
}

describe("executeTombstone", () => {
  test("tombstones an audit event and records evidence", async () => {
    const store = new MemoryTombstoneStore();

    const row = await executeTombstone(store, input({ kind: "audit_event", id: AUDIT_ID }));

    expect(row.target_kind).toBe("audit_event");
    expect(row.original_hash).toBe("a".repeat(64));
    expect(store.auditEvent.payload).toHaveProperty("tombstone");
    expect(store.auditEvent.tombstoned_at).toBeInstanceOf(Date);
    expect(store.tombstoneAuditEvents).toHaveLength(1);
    expect(store.tombstoneAuditEvents[0]?.event_name).toBe("tombstone.executed");
  });

  test("preserves chain verification material after an audit event tombstone", async () => {
    const store = new MemoryTombstoneStore();

    await executeTombstone(store, input({ kind: "audit_event", id: AUDIT_ID }));

    expect(verifyHashChain([toHashRow(store.auditEvent)])).toEqual({ ok: true });
  });

  test("tombstones a transcript turn and records evidence", async () => {
    const store = new MemoryTombstoneStore();

    const row = await executeTombstone(
      store,
      input({ kind: "transcript_turn", id: TRANSCRIPT_ID }),
    );

    expect(row.target_kind).toBe("transcript_turn");
    expect(row.original_hash).toBe("b".repeat(64));
    expect(store.transcriptTurn.content).toBeNull();
    expect(store.transcriptTurn.tombstoned_at).toBeInstanceOf(Date);
  });

  test("rejects already tombstoned targets", async () => {
    const store = new MemoryTombstoneStore();
    store.tombstones.push(tombstoneRecord({ kind: "audit_event", id: AUDIT_ID }));

    await expect(
      executeTombstone(store, input({ kind: "audit_event", id: AUDIT_ID })),
    ).rejects.toThrow(/already/i);
    expect(store.tombstoneAuditEvents[0]?.event_name).toBe("tombstone.denied");
    expect(store.auditEvent.tombstoned_at).toBeNull();
  });

  test("rejects targets under legal hold", async () => {
    const store = new MemoryTombstoneStore();
    store.legalHolds.add(key({ kind: "audit_event", id: AUDIT_ID }));

    await expect(
      executeTombstone(store, input({ kind: "audit_event", id: AUDIT_ID })),
    ).rejects.toThrow(/legal hold/i);
    expect(store.tombstoneAuditEvents[0]?.event_name).toBe("tombstone.denied");
    expect(store.auditEvent.tombstoned_at).toBeNull();
  });

  test("rejects requests without lawful basis", async () => {
    const store = new MemoryTombstoneStore();

    await expect(
      executeTombstone(store, {
        ...input({ kind: "audit_event", id: AUDIT_ID }),
        lawfulBasis: "",
      }),
    ).rejects.toThrow(/lawful basis/i);
    expect(store.tombstoneAuditEvents[0]?.event_name).toBe("tombstone.denied");
    expect(store.auditEvent.tombstoned_at).toBeNull();
  });

  test("rejects requests without operator authorization", async () => {
    const store = new MemoryTombstoneStore();

    await expect(
      executeTombstone(store, {
        ...input({ kind: "audit_event", id: AUDIT_ID }),
        operatorScopes: [],
      }),
    ).rejects.toThrow(/operator authorization/i);
    expect(store.tombstoneAuditEvents[0]?.event_name).toBe("tombstone.denied");
    expect(store.auditEvent.tombstoned_at).toBeNull();
  });
});

function input(target: TombstoneTargetRef): ExecuteTombstoneInput {
  return {
    target,
    subjectRef: "principal:22222222-2222-4222-8222-222222222222",
    lawfulBasis: "GDPR Art. 17 erasure request",
    procedureVersion: "f05.v1",
    operatorPrincipalId: OPERATOR_ID,
    operatorScopes: ["audit.tombstone.execute"],
    correlationId: "corr-tombstone-1",
  };
}

function key(target: TombstoneTargetRef): string {
  return `${target.kind}:${target.id}`;
}

function auditEvent(): AuditLogEventRow {
  const row = {
    audit_event_id: AUDIT_ID,
    source_table: null,
    source_event_id: null,
    event_name: "ticket.transition",
    principal_id: OPERATOR_ID,
    principal_kind: "human",
    role_or_scope: "operator",
    correlation_id: "corr-1",
    payload: { raw: "personal data" },
    payload_hash: "a".repeat(64),
    previous_hash: null,
    event_hash: "",
    chain_namespace: "default",
    hash_algorithm: "sha256",
    canonicalization_version: "v1",
    created_at: new Date("2026-05-19T12:00:00.000Z"),
    tombstoned_at: null,
  };
  return { ...row, event_hash: computeEventHash(toHashRow(row)) };
}

function transcriptTurn(): TranscriptTurnRow {
  return {
    transcript_turn_id: TRANSCRIPT_ID,
    match_ticket_id: "55555555-5555-4555-8555-555555555555",
    run_id: "66666666-6666-4666-8666-666666666666",
    side: "seeker",
    turn_index: 0,
    contract_id: "contract-a",
    contract_version: "v1",
    rubric_id: "rubric-a",
    rubric_version: "v1",
    model_ref: "openai/gpt-5.4-mini",
    tool_call_refs: [],
    content: { raw: "personal data" },
    content_hash: "b".repeat(64),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-19T12:00:00.000Z"),
    tombstoned_at: null,
  };
}

function tombstoneRecord(target: TombstoneTargetRef): TombstoneRecordRow {
  return {
    tombstone_id: "44444444-4444-4444-8444-444444444444",
    target_kind: target.kind,
    target_id: target.id,
    subject_ref: "principal:22222222-2222-4222-8222-222222222222",
    lawful_basis: "GDPR Art. 17 erasure request",
    procedure_version: "f05.v1",
    operator_principal_id: OPERATOR_ID,
    original_hash: "a".repeat(64),
    replacement_hash: "d".repeat(64),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-19T12:00:00.000Z"),
  };
}

function toHashRow(row: AuditLogEventRow) {
  return {
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
  };
}
