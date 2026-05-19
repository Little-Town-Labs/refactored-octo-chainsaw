import { createHash } from "node:crypto";

export type AuditEventHashMaterial = {
  auditEventId: string;
  eventName: string;
  principalId: string;
  principalKind: "human" | "agent" | "service";
  roleOrScope: string | null;
  correlationId: string;
  payloadHash: string;
  previousHash: string | null;
  chainNamespace: string;
  hashAlgorithm: "sha256";
  canonicalizationVersion: string;
  createdAt: string;
};

export type AuditEventHashRow = AuditEventHashMaterial & {
  eventHash: string;
};

export type ChainVerificationResult =
  | { ok: true }
  | {
      ok: false;
      failedAuditEventId: string;
      expectedHash: string;
      actualHash: string;
      reason: "hash_mismatch" | "previous_hash_mismatch";
    };

export function canonicalizeAuditEventMaterial(_event: AuditEventHashMaterial): string {
  const event = _event;
  return JSON.stringify({
    audit_event_id: event.auditEventId,
    canonicalization_version: event.canonicalizationVersion,
    chain_namespace: event.chainNamespace,
    correlation_id: event.correlationId,
    created_at: event.createdAt,
    event_name: event.eventName,
    hash_algorithm: event.hashAlgorithm,
    payload_hash: event.payloadHash,
    previous_hash: event.previousHash,
    principal_id: event.principalId,
    principal_kind: event.principalKind,
    role_or_scope: event.roleOrScope,
  });
}

export function computeEventHash(_event: AuditEventHashMaterial): string {
  if (_event.hashAlgorithm !== "sha256") {
    throw new Error(`Unsupported audit hash algorithm: ${_event.hashAlgorithm}`);
  }
  return createHash("sha256").update(canonicalizeAuditEventMaterial(_event)).digest("hex");
}

export function verifyHashChain(_events: readonly AuditEventHashRow[]): ChainVerificationResult {
  let previousHash: string | null = null;

  for (const event of _events) {
    if (event.previousHash !== previousHash) {
      return {
        ok: false,
        failedAuditEventId: event.auditEventId,
        expectedHash: previousHash ?? "",
        actualHash: event.previousHash ?? "",
        reason: "previous_hash_mismatch",
      };
    }

    const expectedHash = computeEventHash(event);
    if (event.eventHash !== expectedHash) {
      return {
        ok: false,
        failedAuditEventId: event.auditEventId,
        expectedHash,
        actualHash: event.eventHash,
        reason: "hash_mismatch",
      };
    }

    previousHash = event.eventHash;
  }

  return { ok: true };
}
