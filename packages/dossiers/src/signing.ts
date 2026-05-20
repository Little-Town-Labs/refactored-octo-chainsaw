import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";

import {
  DOSSIER_CANONICALIZATION_VERSION,
  canonicalizeForSigning,
  signingContentHash,
} from "./canonicalize.js";
import type { DossierRepository } from "./repo.js";
import type { DossierArtifact, DossierSignature } from "./types.js";

export interface DossierSigningKey {
  readonly kid: string;
  readonly algorithm: "Ed25519";
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
}

export function createTestDossierSigningKey(kid = "dossier-test-key"): DossierSigningKey {
  const pair = generateKeyPairSync("ed25519");
  return { kid, algorithm: "Ed25519", privateKey: pair.privateKey, publicKey: pair.publicKey };
}

export async function signDossier(input: {
  readonly repository: DossierRepository;
  readonly dossier: DossierArtifact;
  readonly key: DossierSigningKey;
  readonly signingEnabled?: boolean;
  readonly audit_event_id?: string | null;
}): Promise<DossierArtifact> {
  if (input.signingEnabled === false) throw new Error("signing_disabled");
  const signedContentHash = signingContentHash(input.dossier);
  const signatureBytes = sign(
    null,
    Buffer.from(canonicalizeForSigning(input.dossier)),
    input.key.privateKey,
  );
  const signature = await input.repository.insertSignature({
    dossier_id: input.dossier.dossier_id,
    algorithm: input.key.algorithm,
    kid: input.key.kid,
    canonicalization_version: DOSSIER_CANONICALIZATION_VERSION,
    signed_content_hash: signedContentHash,
    signature: signatureBytes.toString("base64"),
    signed_at: new Date(),
    audit_event_id: input.audit_event_id ?? null,
  });
  return input.repository.updateDossierSignature({
    dossierId: input.dossier.dossier_id,
    signature,
  });
}

export function signatureForPayload(input: {
  readonly dossier: DossierArtifact;
  readonly signature: DossierSignature;
}): DossierArtifact {
  return { ...input.dossier, signature: input.signature };
}
