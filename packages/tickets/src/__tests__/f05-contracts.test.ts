// F05 T004 — Contract validation smoke tests.
//
// Compiles the F05 YAML JSON Schemas and verifies representative valid
// fixtures pass while deliberately malformed fixtures fail.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { load as loadYaml } from "js-yaml";

const CONTRACT_DIR = resolve(
  process.cwd(),
  "../../.specify/specs/05-audit-log-tombstone/contracts",
);

type ContractName = "audit-log-event" | "tombstone-record" | "transcript-turn";

function compileContract(name: ContractName): ReturnType<Ajv2020["compile"]> {
  const schema = loadYaml(readFileSync(resolve(CONTRACT_DIR, `${name}.schema.yaml`), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

const HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);
const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";
const UUID_3 = "33333333-3333-4333-8333-333333333333";

describe("F05 contract schemas", () => {
  test("accept representative valid fixtures", () => {
    const auditLogEvent = compileContract("audit-log-event");
    const tombstoneRecord = compileContract("tombstone-record");
    const transcriptTurn = compileContract("transcript-turn");

    expect(
      auditLogEvent({
        audit_event_id: UUID_1,
        source_table: "audit_events_buffer",
        source_event_id: UUID_2,
        event_name: "ticket.transition",
        principal_id: UUID_3,
        principal_kind: "human",
        role_or_scope: "operator",
        correlation_id: "corr-001",
        payload: { event: "submitted" },
        payload_hash: HASH,
        previous_hash: null,
        event_hash: OTHER_HASH,
        chain_namespace: "default",
        hash_algorithm: "sha256",
        canonicalization_version: "v1",
        created_at: "2026-05-19T12:00:00.000Z",
        tombstoned_at: null,
      }),
    ).toBe(true);

    expect(
      tombstoneRecord({
        tombstone_id: UUID_1,
        target_kind: "audit_event",
        target_id: UUID_2,
        subject_ref: "principal:11111111-1111-4111-8111-111111111111",
        lawful_basis: "GDPR Art. 17 erasure request",
        procedure_version: "f05.v1",
        operator_principal_id: UUID_3,
        original_hash: HASH,
        replacement_hash: OTHER_HASH,
        audit_event_id: UUID_2,
        created_at: "2026-05-19T12:00:00.000Z",
      }),
    ).toBe(true);

    expect(
      transcriptTurn({
        transcript_turn_id: UUID_1,
        match_ticket_id: UUID_2,
        run_id: UUID_3,
        side: "seeker",
        turn_index: 0,
        contract_id: "contract-a",
        contract_version: "v1",
        rubric_id: "rubric-a",
        rubric_version: "v1",
        model_ref: "openai/gpt-5.4-mini",
        tool_call_refs: ["tool-call-1"],
        content: { text: "Hello" },
        content_hash: HASH,
        audit_event_id: UUID_2,
        created_at: "2026-05-19T12:00:00.000Z",
        tombstoned_at: null,
      }),
    ).toBe(true);
  });

  test("reject deliberately invalid fixtures", () => {
    const auditLogEvent = compileContract("audit-log-event");
    const tombstoneRecord = compileContract("tombstone-record");
    const transcriptTurn = compileContract("transcript-turn");

    expect(
      auditLogEvent({
        audit_event_id: "not-a-uuid",
        event_name: "ticket.transition",
        principal_id: UUID_3,
        principal_kind: "human",
        correlation_id: "corr-001",
        payload: {},
        payload_hash: HASH,
        previous_hash: null,
        event_hash: OTHER_HASH,
        chain_namespace: "default",
        hash_algorithm: "sha512",
        canonicalization_version: "v1",
        created_at: "2026-05-19T12:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      tombstoneRecord({
        tombstone_id: UUID_1,
        target_kind: "ticket",
        target_id: UUID_2,
        subject_ref: "",
        lawful_basis: "GDPR Art. 17 erasure request",
        procedure_version: "f05.v1",
        operator_principal_id: UUID_3,
        original_hash: HASH,
        replacement_hash: OTHER_HASH,
        audit_event_id: UUID_2,
        created_at: "2026-05-19T12:00:00.000Z",
      }),
    ).toBe(false);

    expect(
      transcriptTurn({
        transcript_turn_id: UUID_1,
        match_ticket_id: UUID_2,
        run_id: UUID_3,
        side: "operator",
        turn_index: -1,
        content_hash: HASH,
        audit_event_id: UUID_2,
        created_at: "not-a-date",
      }),
    ).toBe(false);
  });
});
