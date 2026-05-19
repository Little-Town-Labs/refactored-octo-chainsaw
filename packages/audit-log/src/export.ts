import {
  auditLogEvents,
  evidenceExports,
  transcriptTurns,
  type AuditLogEventRow,
  type Db,
  type EvidenceExportRow,
  type NewEvidenceExportRow,
  type TranscriptTurnRow,
} from "@spyglass/db";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";

import { computePayloadHash } from "./writer.js";

export interface EvidenceReadAuth {
  readonly scopes: readonly string[];
}

export interface EvidenceQuery {
  readonly matchTicketId?: string;
  readonly runId?: string;
  readonly principalId?: string;
  readonly correlationId?: string;
  readonly from?: Date;
  readonly to?: Date;
}

export interface EvidenceExportInput {
  readonly requestedByPrincipalId: string;
  readonly purpose: "incident" | "counsel" | "audit" | "operator_review";
  readonly filters: EvidenceQuery;
  readonly chainVerificationStatus: string;
}

export interface EvidenceExportManifest {
  readonly requested_by_principal_id: string;
  readonly purpose: EvidenceExportInput["purpose"];
  readonly filters: EvidenceQuery;
  readonly audit_event_ids: readonly string[];
  readonly transcript_turn_ids: readonly string[];
  readonly tombstones: readonly EvidenceTombstoneMarker[];
  readonly chain_verification_status: string;
  readonly manifest_hash: string;
}

export interface EvidenceTombstoneMarker {
  readonly target_kind: "audit_event" | "transcript_turn";
  readonly target_id: string;
  readonly tombstoned_at: string;
}

export interface EvidenceStore {
  readAuditEvents(query: EvidenceQuery): Promise<readonly AuditLogEventRow[]>;
  readTranscriptTurns(query: EvidenceQuery): Promise<readonly TranscriptTurnRow[]>;
  insertEvidenceExport(
    input: EvidenceExportInput & { manifestHash: string },
  ): Promise<EvidenceExportRow>;
}

export async function readAuditEvidence(
  store: EvidenceStore,
  query: EvidenceQuery,
  auth: EvidenceReadAuth,
): Promise<readonly AuditLogEventRow[]> {
  requireScope(auth, "audit.read");
  return store.readAuditEvents(query);
}

export async function readTranscriptEvidence(
  store: EvidenceStore,
  query: EvidenceQuery,
  auth: EvidenceReadAuth,
): Promise<readonly TranscriptTurnRow[]> {
  requireAnyScope(auth, ["transcript.read", "audit.read"]);
  return store.readTranscriptTurns(query);
}

export async function createEvidenceExport(
  store: EvidenceStore,
  input: EvidenceExportInput,
  auth: EvidenceReadAuth,
): Promise<EvidenceExportManifest> {
  requireScope(auth, "audit.export");
  const [auditEvents, transcriptRows] = await Promise.all([
    store.readAuditEvents(input.filters),
    store.readTranscriptTurns(input.filters),
  ]);
  const auditEventIds = auditEvents.map((row) => row.audit_event_id).sort();
  const transcriptTurnIds = transcriptRows.map((row) => row.transcript_turn_id).sort();
  const manifestBase = {
    requested_by_principal_id: input.requestedByPrincipalId,
    purpose: input.purpose,
    filters: normalizeQuery(input.filters),
    audit_event_ids: auditEventIds,
    transcript_turn_ids: transcriptTurnIds,
    tombstones: tombstoneMarkers(auditEvents, transcriptRows),
    chain_verification_status: input.chainVerificationStatus,
  };
  const manifestHash = computePayloadHash(manifestBase);

  await store.insertEvidenceExport({ ...input, manifestHash });

  return {
    ...manifestBase,
    filters: input.filters,
    manifest_hash: manifestHash,
  };
}

export function createDrizzleEvidenceStore(db: Db): EvidenceStore {
  return {
    async readAuditEvents(query) {
      const conditions = auditConditions(query);
      return db
        .select()
        .from(auditLogEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(auditLogEvents.created_at), asc(auditLogEvents.audit_event_id));
    },
    async readTranscriptTurns(query) {
      const transcriptConditions = transcriptConditionsFor(query);
      const auditJoinNeeded = query.principalId !== undefined || query.correlationId !== undefined;
      if (auditJoinNeeded) {
        const joinedRows = await db
          .select({ transcript: transcriptTurns })
          .from(transcriptTurns)
          .innerJoin(
            auditLogEvents,
            eq(transcriptTurns.audit_event_id, auditLogEvents.audit_event_id),
          )
          .where(transcriptConditions.length > 0 ? and(...transcriptConditions) : undefined)
          .orderBy(asc(transcriptTurns.created_at), asc(transcriptTurns.transcript_turn_id));
        return joinedRows.map((row) => row.transcript);
      }

      return db
        .select()
        .from(transcriptTurns)
        .where(transcriptConditions.length > 0 ? and(...transcriptConditions) : undefined)
        .orderBy(asc(transcriptTurns.created_at), asc(transcriptTurns.transcript_turn_id));
    },
    async insertEvidenceExport(input) {
      const [inserted] = await db
        .insert(evidenceExports)
        .values(toDrizzleInsert(input))
        .returning();
      if (!inserted) throw new Error("failed to insert evidence export");
      return inserted;
    },
  };
}

function requireScope(auth: EvidenceReadAuth, scope: string): void {
  if (!auth.scopes.includes(scope)) {
    throw new Error(`evidence access denied: missing ${scope} scope`);
  }
}

function requireAnyScope(auth: EvidenceReadAuth, scopes: readonly string[]): void {
  if (!scopes.some((scope) => auth.scopes.includes(scope))) {
    throw new Error(`evidence access denied: missing one of ${scopes.join(", ")} scopes`);
  }
}

function auditConditions(query: EvidenceQuery): SQL[] {
  return compactConditions([
    query.principalId ? eq(auditLogEvents.principal_id, query.principalId) : undefined,
    query.correlationId ? eq(auditLogEvents.correlation_id, query.correlationId) : undefined,
    query.from ? gte(auditLogEvents.created_at, query.from) : undefined,
    query.to ? lte(auditLogEvents.created_at, query.to) : undefined,
  ]);
}

function transcriptConditionsFor(query: EvidenceQuery): SQL[] {
  return compactConditions([
    query.matchTicketId ? eq(transcriptTurns.match_ticket_id, query.matchTicketId) : undefined,
    query.runId ? eq(transcriptTurns.run_id, query.runId) : undefined,
    query.principalId ? eq(auditLogEvents.principal_id, query.principalId) : undefined,
    query.correlationId ? eq(auditLogEvents.correlation_id, query.correlationId) : undefined,
    query.from ? gte(transcriptTurns.created_at, query.from) : undefined,
    query.to ? lte(transcriptTurns.created_at, query.to) : undefined,
  ]);
}

function compactConditions(conditions: ReadonlyArray<SQL | undefined>): SQL[] {
  return conditions.filter((condition): condition is SQL => condition !== undefined);
}

function normalizeQuery(query: EvidenceQuery): Record<string, unknown> {
  return {
    ...(query.matchTicketId ? { match_ticket_id: query.matchTicketId } : {}),
    ...(query.runId ? { run_id: query.runId } : {}),
    ...(query.principalId ? { principal_id: query.principalId } : {}),
    ...(query.correlationId ? { correlation_id: query.correlationId } : {}),
    ...(query.from ? { from: query.from.toISOString() } : {}),
    ...(query.to ? { to: query.to.toISOString() } : {}),
  };
}

function tombstoneMarkers(
  auditEvents: readonly AuditLogEventRow[],
  transcriptRows: readonly TranscriptTurnRow[],
): EvidenceTombstoneMarker[] {
  return [
    ...auditEvents.flatMap((row) =>
      row.tombstoned_at
        ? [
            {
              target_kind: "audit_event" as const,
              target_id: row.audit_event_id,
              tombstoned_at: row.tombstoned_at.toISOString(),
            },
          ]
        : [],
    ),
    ...transcriptRows.flatMap((row) =>
      row.tombstoned_at
        ? [
            {
              target_kind: "transcript_turn" as const,
              target_id: row.transcript_turn_id,
              tombstoned_at: row.tombstoned_at.toISOString(),
            },
          ]
        : [],
    ),
  ].sort(
    (a, b) => a.target_kind.localeCompare(b.target_kind) || a.target_id.localeCompare(b.target_id),
  );
}

function toDrizzleInsert(
  input: EvidenceExportInput & { manifestHash: string },
): NewEvidenceExportRow {
  return {
    requested_by_principal_id: input.requestedByPrincipalId,
    purpose: input.purpose,
    filters: normalizeQuery(input.filters),
    manifest_hash: input.manifestHash,
    chain_verification_status: input.chainVerificationStatus,
  };
}
