import { verify, type KeyObject } from "node:crypto";

import { canonicalizeForSigning, signingContentHash } from "./canonicalize.js";
import type { DossierRepository } from "./repo.js";
import type { DossierArtifact, DossierReasonCode, VerificationResult } from "./types.js";

export interface DossierKeyResolver {
  resolve(kid: string): KeyObject | null;
}

export async function verifyDossier(input: {
  readonly repository: DossierRepository;
  readonly dossier: DossierArtifact;
  readonly keys: DossierKeyResolver;
  readonly audit_event_id?: string | null;
}): Promise<VerificationResult> {
  const signature =
    input.dossier.signature ?? (await input.repository.getSignature(input.dossier.dossier_id));
  const contentHash = signingContentHash(input.dossier);
  if (!signature) {
    return append(
      input.repository,
      input.dossier,
      "invalid",
      "signature_invalid",
      null,
      contentHash,
      input.audit_event_id,
    );
  }
  const key = input.keys.resolve(signature.kid);
  if (!key) {
    return append(
      input.repository,
      input.dossier,
      "invalid",
      "unknown_key",
      signature.kid,
      contentHash,
      input.audit_event_id,
    );
  }
  if (signature.signed_content_hash !== contentHash) {
    return append(
      input.repository,
      input.dossier,
      "invalid",
      "signature_invalid",
      signature.kid,
      contentHash,
      input.audit_event_id,
    );
  }
  const ok = verify(
    null,
    Buffer.from(canonicalizeForSigning(input.dossier)),
    key,
    Buffer.from(signature.signature, "base64"),
  );
  return append(
    input.repository,
    input.dossier,
    ok ? "valid" : "invalid",
    ok ? "signature_valid" : "signature_invalid",
    signature.kid,
    contentHash,
    input.audit_event_id,
  );
}

async function append(
  repository: DossierRepository,
  dossier: DossierArtifact,
  decision: "valid" | "invalid",
  reasonCode: DossierReasonCode,
  kid: string | null,
  contentHash: string,
  auditEventId?: string | null,
): Promise<VerificationResult> {
  return repository.appendVerification({
    dossier_id: dossier.dossier_id,
    decision,
    reason_code: reasonCode,
    kid,
    content_hash: contentHash,
    audit_event_id: auditEventId ?? null,
  });
}
