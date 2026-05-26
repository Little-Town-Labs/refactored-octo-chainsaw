import type { EvidenceRef } from "./types.js";

export type PreserveEvidenceInput = EvidenceRef & {
  incident_id: string;
  created_by_principal_id: string;
  retention_note?: string;
  tombstone_ref?: string;
};

export type PreservedEvidence = PreserveEvidenceInput & {
  id: string;
  created_at: string;
};

export function preserveEvidenceReference(
  input: PreserveEvidenceInput,
  now = new Date(),
): PreservedEvidence {
  if (input.ref.length === 0) {
    throw new Error("Evidence reference cannot be empty");
  }
  if (looksLikeRawPayload(input.ref)) {
    throw new Error("Evidence references must point to durable IDs or hashes, not raw payloads");
  }
  return {
    id: `ev_${input.kind}_${stableRef(input.ref)}`,
    created_at: now.toISOString(),
    ...input,
  };
}

function looksLikeRawPayload(value: string): boolean {
  return value.includes("\n") || value.length > 512;
}

function stableRef(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}
