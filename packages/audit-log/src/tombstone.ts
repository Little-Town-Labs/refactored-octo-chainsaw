import {
  auditLogEvents,
  tombstoneRecords,
  transcriptTurns,
  type AuditLogEventRow,
  type Db,
  type NewTombstoneRecordRow,
  type TombstoneRecordRow,
  type TranscriptTurnRow,
} from "@spyglass/db";
import { and, asc, eq } from "drizzle-orm";

import {
  appendCanonicalAuditEvent,
  computePayloadHash,
  createDrizzleCanonicalAuditWriterTx,
  type AppendCanonicalAuditEventInput,
} from "./writer.js";

export type TombstoneTargetKind = "audit_event" | "transcript_turn";

export interface TombstoneTargetRef {
  readonly kind: TombstoneTargetKind;
  readonly id: string;
}

export interface ExecuteTombstoneInput {
  readonly target: TombstoneTargetRef;
  readonly subjectRef: string;
  readonly lawfulBasis: string;
  readonly procedureVersion: string;
  readonly operatorPrincipalId: string;
  readonly operatorScopes?: readonly string[];
  readonly correlationId: string;
}

export interface TombstoneStore {
  transaction<T>(fn: (tx: TombstoneTx) => Promise<T>): Promise<T>;
}

export interface TombstoneTx {
  resolveTargets(subjectRef: string): Promise<readonly TombstoneTargetRef[]>;
  getAuditEvent(id: string): Promise<AuditLogEventRow | null>;
  getTranscriptTurn(id: string): Promise<TranscriptTurnRow | null>;
  hasTombstone(target: TombstoneTargetRef): Promise<boolean>;
  hasLegalHold(target: TombstoneTargetRef): Promise<boolean>;
  appendTombstoneAuditEvent(input: AppendCanonicalAuditEventInput): Promise<AuditLogEventRow>;
  updateAuditEventTombstone(id: string, payload: Record<string, unknown>, at: Date): Promise<void>;
  updateTranscriptTurnTombstone(id: string, at: Date): Promise<void>;
  insertTombstoneRecord(
    record: Omit<TombstoneRecordRow, "tombstone_id" | "created_at"> & { created_at?: Date },
  ): Promise<TombstoneRecordRow>;
}

export interface DrizzleTombstoneStoreOptions {
  readonly hasLegalHold?: (target: TombstoneTargetRef) => Promise<boolean>;
}

export async function executeTombstone(
  store: TombstoneStore,
  input: ExecuteTombstoneInput,
): Promise<TombstoneRecordRow> {
  const validationDenial = validateTombstoneInput(input);
  if (validationDenial) {
    await auditTombstoneDenial(store, input, validationDenial);
    throw tombstoneDenialError(validationDenial);
  }

  const preflight = await store.transaction(async (tx) => {
    const resolvedTargets = await resolveTombstoneTargets(tx, input.subjectRef);
    if (!includesTarget(resolvedTargets, input.target)) {
      return { denied: "subject_mismatch" as const };
    }
    if (await tx.hasTombstone(input.target)) {
      return { denied: "already_tombstoned" as const };
    }
    if (await tx.hasLegalHold(input.target)) {
      return { denied: "legal_hold" as const };
    }
    return { denied: null };
  });

  if (preflight.denied) {
    await auditTombstoneDenial(store, input, preflight.denied);
    throw tombstoneDenialError(preflight.denied);
  }

  return store.transaction(async (tx) => {
    const tombstonedAt = new Date();
    const originalHash =
      input.target.kind === "audit_event"
        ? (await loadAuditTarget(tx, input.target.id)).payload_hash
        : (await loadTranscriptTarget(tx, input.target.id)).content_hash;
    const replacementPayload = tombstonePayload(input, tombstonedAt);
    const replacementHash = computePayloadHash(replacementPayload);
    const auditEvent = await tx.appendTombstoneAuditEvent({
      eventName: "tombstone.executed",
      principalId: input.operatorPrincipalId,
      principalKind: "human",
      roleOrScope: "privacy.operator",
      correlationId: input.correlationId,
      payload: {
        target_kind: input.target.kind,
        target_id: input.target.id,
        subject_ref: input.subjectRef,
        lawful_basis: input.lawfulBasis,
        procedure_version: input.procedureVersion,
        original_hash: originalHash,
        replacement_hash: replacementHash,
      },
      chainNamespace: "tombstone",
      createdAt: tombstonedAt,
    });

    if (input.target.kind === "audit_event") {
      await tx.updateAuditEventTombstone(input.target.id, replacementPayload, tombstonedAt);
    } else {
      await tx.updateTranscriptTurnTombstone(input.target.id, tombstonedAt);
    }

    return tx.insertTombstoneRecord({
      target_kind: input.target.kind,
      target_id: input.target.id,
      subject_ref: input.subjectRef,
      lawful_basis: input.lawfulBasis,
      procedure_version: input.procedureVersion,
      operator_principal_id: input.operatorPrincipalId,
      original_hash: originalHash,
      replacement_hash: replacementHash,
      audit_event_id: auditEvent.audit_event_id,
      created_at: tombstonedAt,
    });
  });
}

export async function resolveTombstoneTargets(
  tx: Pick<TombstoneTx, "resolveTargets">,
  subjectRef: string,
): Promise<readonly TombstoneTargetRef[]> {
  const unique = new Map<string, TombstoneTargetRef>();
  for (const target of await tx.resolveTargets(subjectRef)) {
    unique.set(targetKey(target), target);
  }
  return [...unique.values()].sort(compareTargets);
}

export function createDrizzleTombstoneStore(
  db: Db,
  options: DrizzleTombstoneStoreOptions = {},
): TombstoneStore {
  return {
    transaction<T>(fn: (tx: TombstoneTx) => Promise<T>): Promise<T> {
      return db.transaction(async (dbTx) => {
        const scopedDb = dbTx as unknown as Db;
        const auditTx = createDrizzleCanonicalAuditWriterTx(scopedDb);

        const tx: TombstoneTx = {
          async resolveTargets(subjectRef) {
            const principalId = parsePrincipalSubjectRef(subjectRef);
            if (!principalId) return [];

            const [auditRows, transcriptRows] = await Promise.all([
              scopedDb
                .select({ id: auditLogEvents.audit_event_id })
                .from(auditLogEvents)
                .where(eq(auditLogEvents.principal_id, principalId))
                .orderBy(asc(auditLogEvents.audit_event_id)),
              scopedDb
                .select({ id: transcriptTurns.transcript_turn_id })
                .from(transcriptTurns)
                .innerJoin(
                  auditLogEvents,
                  eq(transcriptTurns.audit_event_id, auditLogEvents.audit_event_id),
                )
                .where(eq(auditLogEvents.principal_id, principalId))
                .orderBy(asc(transcriptTurns.transcript_turn_id)),
            ]);

            return [
              ...auditRows.map((row) => ({ kind: "audit_event" as const, id: row.id })),
              ...transcriptRows.map((row) => ({
                kind: "transcript_turn" as const,
                id: row.id,
              })),
            ];
          },
          async getAuditEvent(id) {
            const [row] = await scopedDb
              .select()
              .from(auditLogEvents)
              .where(eq(auditLogEvents.audit_event_id, id))
              .limit(1);
            return row ?? null;
          },
          async getTranscriptTurn(id) {
            const [row] = await scopedDb
              .select()
              .from(transcriptTurns)
              .where(eq(transcriptTurns.transcript_turn_id, id))
              .limit(1);
            return row ?? null;
          },
          async hasTombstone(target) {
            const [row] = await scopedDb
              .select({ tombstone_id: tombstoneRecords.tombstone_id })
              .from(tombstoneRecords)
              .where(
                and(
                  eq(tombstoneRecords.target_kind, target.kind),
                  eq(tombstoneRecords.target_id, target.id),
                ),
              )
              .limit(1);
            return row !== undefined;
          },
          async hasLegalHold(target) {
            return options.hasLegalHold ? options.hasLegalHold(target) : true;
          },
          appendTombstoneAuditEvent: (eventInput) =>
            appendCanonicalAuditEvent({ transaction: (inner) => inner(auditTx) }, eventInput),
          async updateAuditEventTombstone(id, payload, at) {
            await scopedDb
              .update(auditLogEvents)
              .set({ payload, tombstoned_at: at })
              .where(eq(auditLogEvents.audit_event_id, id));
          },
          async updateTranscriptTurnTombstone(id, at) {
            await scopedDb
              .update(transcriptTurns)
              .set({ content: null, tombstoned_at: at })
              .where(eq(transcriptTurns.transcript_turn_id, id));
          },
          async insertTombstoneRecord(record) {
            const [inserted] = await scopedDb
              .insert(tombstoneRecords)
              .values(toDrizzleInsert(record))
              .returning();
            if (!inserted) throw new Error("failed to insert tombstone record");
            return inserted;
          },
        };

        return fn(tx);
      });
    },
  };
}

async function loadAuditTarget(tx: TombstoneTx, id: string): Promise<AuditLogEventRow> {
  const row = await tx.getAuditEvent(id);
  if (!row) throw new Error("tombstone target audit event not found");
  return row;
}

async function loadTranscriptTarget(tx: TombstoneTx, id: string): Promise<TranscriptTurnRow> {
  const row = await tx.getTranscriptTurn(id);
  if (!row) throw new Error("tombstone target transcript turn not found");
  return row;
}

type TombstoneDenialReason =
  | "missing_lawful_basis"
  | "missing_subject_ref"
  | "missing_procedure_version"
  | "missing_operator_authorization"
  | "subject_mismatch"
  | "already_tombstoned"
  | "legal_hold";

function validateTombstoneInput(input: ExecuteTombstoneInput): TombstoneDenialReason | null {
  if (!input.lawfulBasis.trim()) {
    return "missing_lawful_basis";
  }
  if (!input.subjectRef.trim()) {
    return "missing_subject_ref";
  }
  if (!input.procedureVersion.trim()) {
    return "missing_procedure_version";
  }
  if (!input.operatorScopes?.includes("audit.tombstone.execute")) {
    return "missing_operator_authorization";
  }
  return null;
}

async function auditTombstoneDenial(
  store: TombstoneStore,
  input: ExecuteTombstoneInput,
  reason: TombstoneDenialReason,
): Promise<void> {
  await store.transaction(async (tx) => {
    await tx.appendTombstoneAuditEvent({
      eventName: "tombstone.denied",
      principalId: input.operatorPrincipalId,
      principalKind: "human",
      roleOrScope: "privacy.operator",
      correlationId: input.correlationId,
      payload: {
        target_kind: input.target.kind,
        target_id: input.target.id,
        subject_ref: input.subjectRef,
        lawful_basis_present: input.lawfulBasis.trim().length > 0,
        procedure_version: input.procedureVersion,
        denial_reason: reason,
      },
      chainNamespace: "tombstone",
      createdAt: new Date(),
    });
  });
}

function tombstoneDenialError(reason: TombstoneDenialReason): Error {
  if (reason === "missing_lawful_basis") return new Error("tombstone requires lawful basis");
  if (reason === "missing_subject_ref") return new Error("tombstone requires subject reference");
  if (reason === "missing_procedure_version") {
    return new Error("tombstone requires procedure version");
  }
  if (reason === "missing_operator_authorization") {
    return new Error("tombstone requires operator authorization");
  }
  if (reason === "subject_mismatch") {
    return new Error("tombstone target is not associated with subject reference");
  }
  if (reason === "already_tombstoned") return new Error("tombstone target is already tombstoned");
  return new Error("tombstone target is under legal hold");
}

function tombstonePayload(
  input: ExecuteTombstoneInput,
  tombstonedAt: Date,
): Record<string, unknown> {
  return {
    tombstone: {
      target_kind: input.target.kind,
      target_id: input.target.id,
      subject_ref: input.subjectRef,
      lawful_basis: input.lawfulBasis,
      procedure_version: input.procedureVersion,
      tombstoned_at: tombstonedAt.toISOString(),
    },
  };
}

function includesTarget(
  targets: readonly TombstoneTargetRef[],
  target: TombstoneTargetRef,
): boolean {
  return targets.some((candidate) => candidate.kind === target.kind && candidate.id === target.id);
}

function compareTargets(a: TombstoneTargetRef, b: TombstoneTargetRef): number {
  return a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
}

function targetKey(target: TombstoneTargetRef): string {
  return `${target.kind}:${target.id}`;
}

function parsePrincipalSubjectRef(subjectRef: string): string | null {
  return subjectRef.startsWith("principal:") ? subjectRef.slice("principal:".length) : null;
}

function toDrizzleInsert(
  record: Omit<TombstoneRecordRow, "tombstone_id" | "created_at"> & { created_at?: Date },
): NewTombstoneRecordRow {
  return {
    target_kind: record.target_kind,
    target_id: record.target_id,
    subject_ref: record.subject_ref,
    lawful_basis: record.lawful_basis,
    procedure_version: record.procedure_version,
    operator_principal_id: record.operator_principal_id,
    original_hash: record.original_hash,
    replacement_hash: record.replacement_hash,
    audit_event_id: record.audit_event_id,
    ...(record.created_at ? { created_at: record.created_at } : {}),
  };
}
