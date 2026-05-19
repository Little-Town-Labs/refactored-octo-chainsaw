import type { AuditLogEventRow, EvidenceExportRow, TranscriptTurnRow } from "@spyglass/db";

import {
  createEvidenceExport,
  readAuditEvidence,
  readTranscriptEvidence,
  type EvidenceExportInput,
  type EvidenceStore,
} from "../export.js";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const TRANSCRIPT_ID = "22222222-2222-4222-8222-222222222222";
const PRINCIPAL_ID = "33333333-3333-4333-8333-333333333333";

class MemoryEvidenceStore implements EvidenceStore {
  readonly auditEvents = [auditEvent()];
  readonly transcriptTurns = [transcriptTurn()];
  readonly exports: EvidenceExportRow[] = [];

  async readAuditEvents(): Promise<readonly AuditLogEventRow[]> {
    return this.auditEvents;
  }

  async readTranscriptTurns(): Promise<readonly TranscriptTurnRow[]> {
    return this.transcriptTurns;
  }

  async insertEvidenceExport(
    input: EvidenceExportInput & { manifestHash: string },
  ): Promise<EvidenceExportRow> {
    const row: EvidenceExportRow = {
      export_id: "44444444-4444-4444-8444-444444444444",
      requested_by_principal_id: input.requestedByPrincipalId,
      purpose: input.purpose,
      filters: input.filters,
      manifest_hash: input.manifestHash,
      chain_verification_status: input.chainVerificationStatus,
      created_at: new Date("2026-05-19T12:00:00.000Z"),
    };
    this.exports.push(row);
    return row;
  }
}

describe("evidence read/export authorization", () => {
  test("denies unscoped audit reads by default", async () => {
    const store = new MemoryEvidenceStore();

    await expect(readAuditEvidence(store, {}, { scopes: [] })).rejects.toThrow(/denied/i);
  });

  test("allows scoped audit reads", async () => {
    const store = new MemoryEvidenceStore();

    await expect(readAuditEvidence(store, {}, { scopes: ["audit.read"] })).resolves.toHaveLength(1);
  });

  test("denies unscoped transcript evidence reads by default", async () => {
    const store = new MemoryEvidenceStore();

    await expect(readTranscriptEvidence(store, {}, { scopes: [] })).rejects.toThrow(/denied/i);
  });

  test("allows transcript reads with either transcript or audit scope", async () => {
    const store = new MemoryEvidenceStore();

    await expect(
      readTranscriptEvidence(store, {}, { scopes: ["transcript.read"] }),
    ).resolves.toHaveLength(1);
    await expect(
      readTranscriptEvidence(store, {}, { scopes: ["audit.read"] }),
    ).resolves.toHaveLength(1);
  });

  test("denies unscoped evidence export creation by default", async () => {
    const store = new MemoryEvidenceStore();

    await expect(createEvidenceExport(store, exportInput(), { scopes: [] })).rejects.toThrow(
      /denied/i,
    );
  });

  test("creates deterministic manifests for scoped exports", async () => {
    const store = new MemoryEvidenceStore();

    const first = await createEvidenceExport(store, exportInput(), { scopes: ["audit.export"] });
    const second = await createEvidenceExport(store, exportInput(), { scopes: ["audit.export"] });

    expect(first.manifest_hash).toBe(second.manifest_hash);
    expect(first.audit_event_ids).toEqual([AUDIT_ID]);
    expect(first.transcript_turn_ids).toEqual([TRANSCRIPT_ID]);
    expect(first.tombstones).toEqual([]);
    expect(store.exports).toHaveLength(2);
  });
});

function exportInput(): EvidenceExportInput {
  return {
    requestedByPrincipalId: PRINCIPAL_ID,
    purpose: "counsel",
    filters: { principalId: PRINCIPAL_ID },
    chainVerificationStatus: "valid",
  };
}

function auditEvent(): AuditLogEventRow {
  return {
    audit_event_id: AUDIT_ID,
    source_table: null,
    source_event_id: null,
    event_name: "ticket.transition",
    principal_id: PRINCIPAL_ID,
    principal_kind: "human",
    role_or_scope: "operator",
    correlation_id: "corr-1",
    payload: { ticket: "ST-2026-00001" },
    payload_hash: "a".repeat(64),
    previous_hash: null,
    event_hash: "c".repeat(64),
    chain_namespace: "default",
    hash_algorithm: "sha256",
    canonicalization_version: "v1",
    created_at: new Date("2026-05-19T12:00:00.000Z"),
    tombstoned_at: null,
  };
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
    content: { raw: "transcript" },
    content_hash: "b".repeat(64),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-19T12:00:00.000Z"),
    tombstoned_at: null,
  };
}
