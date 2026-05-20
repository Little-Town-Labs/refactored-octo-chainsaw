import {
  type Db,
  type DossierArtifactRow,
  dossierArtifacts,
  type DossierProjectionRow,
  dossierProjections,
  type DossierSignatureRow,
  dossierSignatures,
  type DossierVerificationEventRow,
  dossierVerificationEvents,
  type NewDossierArtifactRow,
  type NewDossierProjectionRow,
  type NewDossierSignatureRow,
  type NewDossierVerificationEventRow,
} from "@spyglass/db";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";

import type {
  DossierArtifact,
  DossierProjection,
  DossierSignature,
  NewDossierArtifact,
  NewDossierProjection,
  NewDossierSignature,
  NewVerificationResult,
  VerificationResult,
} from "./types.js";

export interface DossierRepository {
  insertDossier(input: NewDossierArtifact): Promise<DossierArtifact>;
  updateDossierSignature(input: {
    readonly dossierId: string;
    readonly signature: DossierSignature;
  }): Promise<DossierArtifact>;
  getDossier(dossierId: string): Promise<DossierArtifact | null>;
  insertProjection(input: NewDossierProjection): Promise<DossierProjection>;
  listProjections(dossierId: string): Promise<readonly DossierProjection[]>;
  insertSignature(input: NewDossierSignature): Promise<DossierSignature>;
  getSignature(dossierId: string): Promise<DossierSignature | null>;
  appendVerification(input: NewVerificationResult): Promise<VerificationResult>;
  listVerificationEvents(dossierId: string): Promise<readonly VerificationResult[]>;
  listDossiers(): Promise<readonly DossierArtifact[]>;
}

export function createDrizzleDossierRepository(db: Db): DossierRepository {
  return {
    async insertDossier(input) {
      const [row] = await db.insert(dossierArtifacts).values(toDossierInsert(input)).returning();
      if (!row) throw new Error("failed to insert dossier");
      return toDossier(row);
    },
    async updateDossierSignature(input) {
      const [row] = await db
        .update(dossierArtifacts)
        .set({ signature: toStoredSignature(input.signature) })
        .where(eq(dossierArtifacts.dossier_id, input.dossierId))
        .returning();
      if (!row) throw new Error("failed to update dossier signature");
      return toDossier(row);
    },
    async getDossier(dossierId) {
      const rows = await db
        .select()
        .from(dossierArtifacts)
        .where(eq(dossierArtifacts.dossier_id, dossierId))
        .limit(1);
      return rows[0] ? toDossier(rows[0]) : null;
    },
    async insertProjection(input) {
      const [row] = await db
        .insert(dossierProjections)
        .values(toProjectionInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert dossier projection");
      return toProjection(row);
    },
    async listProjections(dossierId) {
      const rows = await db
        .select()
        .from(dossierProjections)
        .where(eq(dossierProjections.dossier_id, dossierId))
        .orderBy(desc(dossierProjections.created_at));
      return rows.map(toProjection);
    },
    async insertSignature(input) {
      const [row] = await db.insert(dossierSignatures).values(toSignatureInsert(input)).returning();
      if (!row) throw new Error("failed to insert dossier signature");
      return toSignature(row);
    },
    async getSignature(dossierId) {
      const rows = await db
        .select()
        .from(dossierSignatures)
        .where(eq(dossierSignatures.dossier_id, dossierId))
        .limit(1);
      return rows[0] ? toSignature(rows[0]) : null;
    },
    async appendVerification(input) {
      const [row] = await db
        .insert(dossierVerificationEvents)
        .values(toVerificationInsert(input))
        .returning();
      if (!row) throw new Error("failed to append verification event");
      return toVerification(row);
    },
    async listVerificationEvents(dossierId) {
      const rows = await db
        .select()
        .from(dossierVerificationEvents)
        .where(eq(dossierVerificationEvents.dossier_id, dossierId))
        .orderBy(desc(dossierVerificationEvents.created_at));
      return rows.map(toVerification);
    },
    async listDossiers() {
      const rows = await db
        .select()
        .from(dossierArtifacts)
        .orderBy(desc(dossierArtifacts.created_at));
      return rows.map(toDossier);
    },
  };
}

export class InMemoryDossierRepository implements DossierRepository {
  readonly dossiers = new Map<string, DossierArtifact>();
  readonly projections: DossierProjection[] = [];
  readonly signatures: DossierSignature[] = [];
  readonly verifications: VerificationResult[] = [];

  async insertDossier(input: NewDossierArtifact): Promise<DossierArtifact> {
    const dossier: DossierArtifact = {
      ...input,
      dossier_id: input.dossier_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.dossiers.set(dossier.dossier_id, dossier);
    return dossier;
  }

  async updateDossierSignature(input: {
    readonly dossierId: string;
    readonly signature: DossierSignature;
  }): Promise<DossierArtifact> {
    const dossier = this.dossiers.get(input.dossierId);
    if (!dossier) throw new Error("dossier not found");
    const updated = { ...dossier, signature: input.signature };
    this.dossiers.set(input.dossierId, updated);
    return updated;
  }

  async getDossier(dossierId: string): Promise<DossierArtifact | null> {
    return this.dossiers.get(dossierId) ?? null;
  }

  async insertProjection(input: NewDossierProjection): Promise<DossierProjection> {
    const projection: DossierProjection = {
      ...input,
      projection_id: input.projection_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.projections.push(projection);
    return projection;
  }

  async listProjections(dossierId: string): Promise<readonly DossierProjection[]> {
    return this.projections.filter((projection) => projection.dossier_id === dossierId);
  }

  async insertSignature(input: NewDossierSignature): Promise<DossierSignature> {
    const signature: DossierSignature = {
      ...input,
      signature_id: input.signature_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.signatures.push(signature);
    return signature;
  }

  async getSignature(dossierId: string): Promise<DossierSignature | null> {
    return this.signatures.find((signature) => signature.dossier_id === dossierId) ?? null;
  }

  async appendVerification(input: NewVerificationResult): Promise<VerificationResult> {
    const verification: VerificationResult = {
      ...input,
      verification_id: input.verification_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.verifications.push(verification);
    return verification;
  }

  async listVerificationEvents(dossierId: string): Promise<readonly VerificationResult[]> {
    return this.verifications.filter((verification) => verification.dossier_id === dossierId);
  }

  async listDossiers(): Promise<readonly DossierArtifact[]> {
    return [...this.dossiers.values()];
  }
}

function toDossier(row: DossierArtifactRow): DossierArtifact {
  return {
    ...(row as unknown as Omit<DossierArtifact, "signature">),
    signature: row.signature ? toEmbeddedSignature(row.signature) : null,
  };
}

function toProjection(row: DossierProjectionRow): DossierProjection {
  return {
    projection_id: row.projection_id,
    dossier_id: row.dossier_id,
    audience: row.audience as DossierProjection["audience"],
    disclosure_stage: row.disclosure_stage,
    ruleset_ref: { ruleset_id: row.ruleset_id, version: row.ruleset_version },
    payload: row.payload,
    payload_hash: row.payload_hash,
    created_at: row.created_at,
  };
}

function toSignature(row: DossierSignatureRow): DossierSignature {
  return row as DossierSignature;
}

function toVerification(row: DossierVerificationEventRow): VerificationResult {
  return row as VerificationResult;
}

function toDossierInsert(input: NewDossierArtifact): NewDossierArtifactRow {
  return input as unknown as NewDossierArtifactRow;
}

function toProjectionInsert(input: NewDossierProjection): NewDossierProjectionRow {
  return {
    projection_id: input.projection_id,
    dossier_id: input.dossier_id,
    audience: input.audience,
    disclosure_stage: input.disclosure_stage,
    ruleset_id: input.ruleset_ref.ruleset_id,
    ruleset_version: input.ruleset_ref.version,
    payload: input.payload,
    payload_hash: input.payload_hash,
    created_at: input.created_at,
  };
}

function toSignatureInsert(input: NewDossierSignature): NewDossierSignatureRow {
  return input as NewDossierSignatureRow;
}

function toVerificationInsert(input: NewVerificationResult): NewDossierVerificationEventRow {
  return input as NewDossierVerificationEventRow;
}

function toStoredSignature(signature: DossierSignature): Record<string, unknown> {
  return {
    signature_id: signature.signature_id,
    dossier_id: signature.dossier_id,
    algorithm: signature.algorithm,
    kid: signature.kid,
    canonicalization_version: signature.canonicalization_version,
    signed_content_hash: signature.signed_content_hash,
    signature: signature.signature,
    signed_at: signature.signed_at.toISOString(),
    audit_event_id: signature.audit_event_id,
    created_at: signature.created_at.toISOString(),
  };
}

function toEmbeddedSignature(input: Record<string, unknown>): DossierSignature {
  return {
    signature_id: String(input.signature_id),
    dossier_id: String(input.dossier_id),
    algorithm: "Ed25519",
    kid: String(input.kid),
    canonicalization_version: String(input.canonicalization_version),
    signed_content_hash: String(input.signed_content_hash),
    signature: String(input.signature),
    signed_at: new Date(String(input.signed_at)),
    audit_event_id: input.audit_event_id ? String(input.audit_event_id) : null,
    created_at: new Date(String(input.created_at)),
  };
}
