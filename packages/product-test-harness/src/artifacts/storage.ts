import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ArtifactRedactionStatus,
  ArtifactType,
  RunArtifact,
  SafeMetadata,
} from "../contracts.js";
import { assertLogSafety } from "../observability/log-safety.js";

export type ProductArtifactRetentionClass =
  | "ephemeral"
  | "ci_artifact"
  | "canary_history"
  | "release_evidence";

export type ProductArtifactStorageProvider =
  | "local_file"
  | "vercel_blob"
  | "s3_compatible"
  | "other";

export interface ProductArtifactStorageInput {
  readonly artifact_id: string;
  readonly run_id: string;
  readonly scenario_id: string;
  readonly label: string;
  readonly type: ArtifactType;
  readonly content: string | Uint8Array;
  readonly content_type?: string;
  readonly redaction_status: ArtifactRedactionStatus;
  readonly redaction_note?: string;
  readonly retention_class: ProductArtifactRetentionClass;
  readonly metadata?: SafeMetadata;
}

export interface ProductStoredArtifact {
  readonly artifact_id: string;
  readonly run_id: string;
  readonly scenario_id: string;
  readonly label: string;
  readonly type: ArtifactType;
  readonly uri: string;
  readonly provider: ProductArtifactStorageProvider;
  readonly content_type?: string;
  readonly size_bytes: number;
  readonly checksum: string;
  readonly redaction_status: ArtifactRedactionStatus;
  readonly redaction_note?: string;
  readonly retention_class: ProductArtifactRetentionClass;
  readonly created_at: string;
  readonly metadata?: SafeMetadata;
}

export interface ProductArtifactStoreSaveResult {
  readonly artifact: ProductStoredArtifact;
  readonly created: boolean;
  readonly idempotent: boolean;
}

export interface ProductArtifactStore {
  saveArtifact(input: ProductArtifactStorageInput): Promise<ProductArtifactStoreSaveResult>;
  getArtifactMetadata(artifactId: string): Promise<ProductStoredArtifact | undefined>;
}

export interface LocalFileProductArtifactStoreOptions {
  readonly directory: string;
  readonly uriPrefix?: string;
  readonly now?: () => Date;
}

export class ProductArtifactStoreError extends Error {
  constructor(
    message: string,
    readonly code: "validation_failed" | "duplicate_conflict" | "read_failed" | "write_failed",
  ) {
    super(message);
    this.name = "ProductArtifactStoreError";
  }
}

export class LocalFileProductArtifactStore implements ProductArtifactStore {
  private readonly uriPrefix: string;
  private readonly now: () => Date;

  constructor(private readonly options: LocalFileProductArtifactStoreOptions) {
    this.uriPrefix = options.uriPrefix ?? "artifact://durable/local";
    this.now = options.now ?? (() => new Date());
  }

  async saveArtifact(input: ProductArtifactStorageInput): Promise<ProductArtifactStoreSaveResult> {
    assertValidProductArtifactStorageInput(input);
    const content = artifactContentBytes(input.content);
    const checksum = productArtifactChecksum(content);
    const artifactPath = this.artifactPath(input.artifact_id);
    const metadataPath = this.metadataPath(input.artifact_id);

    await mkdir(this.options.directory, { recursive: true });
    const existing = await this.getArtifactMetadata(input.artifact_id);
    if (existing) {
      if (existing.checksum === checksum) {
        return { artifact: existing, created: false, idempotent: true };
      }
      throw new ProductArtifactStoreError(
        `Artifact ${input.artifact_id} already exists with different content`,
        "duplicate_conflict",
      );
    }

    const artifact = storedArtifactFromInput({
      input,
      checksum,
      size_bytes: content.byteLength,
      uri: this.artifactUri(input.artifact_id),
      created_at: this.now().toISOString(),
    });
    const tempArtifactPath = `${artifactPath}.${process.pid}.${Date.now()}.tmp`;
    const tempMetadataPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;

    try {
      await writeFile(tempArtifactPath, content);
      await writeFile(tempMetadataPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
      await rename(tempArtifactPath, artifactPath);
      await rename(tempMetadataPath, metadataPath);
    } catch (error) {
      throw new ProductArtifactStoreError(
        `Failed to persist artifact ${input.artifact_id}: ${stringifyError(error)}`,
        "write_failed",
      );
    }

    return { artifact, created: true, idempotent: false };
  }

  async getArtifactMetadata(artifactId: string): Promise<ProductStoredArtifact | undefined> {
    assertSafeArtifactId(artifactId);
    try {
      const payload = await readFile(this.metadataPath(artifactId), "utf8");
      const artifact = JSON.parse(payload) as ProductStoredArtifact;
      assertValidStoredProductArtifact(artifact);
      return artifact;
    } catch (error) {
      if (isNotFound(error)) return undefined;
      if (error instanceof ProductArtifactStoreError) throw error;
      throw new ProductArtifactStoreError(
        `Failed to read artifact ${artifactId}: ${stringifyError(error)}`,
        "read_failed",
      );
    }
  }

  private artifactPath(artifactId: string): string {
    return path.join(this.options.directory, `${encodeURIComponent(artifactId)}.bin`);
  }

  private metadataPath(artifactId: string): string {
    return path.join(this.options.directory, `${encodeURIComponent(artifactId)}.metadata.json`);
  }

  private artifactUri(artifactId: string): string {
    return `${this.uriPrefix.replace(/\/$/, "")}/${encodeURIComponent(artifactId)}`;
  }
}

export function productArtifactChecksum(content: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(artifactContentBytes(content)).digest("hex")}`;
}

export function toRunArtifact(artifact: ProductStoredArtifact): RunArtifact {
  assertValidStoredProductArtifact(artifact);
  return {
    artifact_id: artifact.artifact_id,
    label: artifact.label,
    type: artifact.type,
    uri: artifact.uri,
    redaction_status: artifact.redaction_status,
    checksum: artifact.checksum,
    metadata: {
      ...(artifact.metadata ?? {}),
      durable_storage: {
        provider: artifact.provider,
        retention_class: artifact.retention_class,
        size_bytes: artifact.size_bytes,
        content_type: artifact.content_type,
        created_at: artifact.created_at,
      },
      ...(artifact.redaction_note ? { redaction_note: artifact.redaction_note } : {}),
    },
  };
}

export function validateProductArtifactStorageInput(input: ProductArtifactStorageInput): string[] {
  const issues: string[] = [];
  validateIdentity(input, issues);
  if (artifactContentBytes(input.content).byteLength === 0) {
    issues.push("artifact.content must be non-empty");
  }
  validateRedactionNote(input.redaction_status, input.redaction_note, "artifact", issues);
  validateSafeArtifactMetadata(input.metadata, "artifact.metadata", issues);
  return issues;
}

export function assertValidProductArtifactStorageInput(input: ProductArtifactStorageInput): void {
  const issues = validateProductArtifactStorageInput(input);
  if (issues.length > 0) {
    throw new ProductArtifactStoreError(issues.join("; "), "validation_failed");
  }
}

export function assertValidStoredProductArtifact(artifact: ProductStoredArtifact): void {
  const issues: string[] = [];
  validateIdentity(artifact, issues);
  if (!artifact.uri) issues.push("artifact.uri must be non-empty");
  if (artifact.size_bytes <= 0) issues.push("artifact.size_bytes must be positive");
  if (!/^sha256:[a-f0-9]{64}$/.test(artifact.checksum)) {
    issues.push("artifact.checksum must be sha256 hex");
  }
  validateRedactionNote(artifact.redaction_status, artifact.redaction_note, "artifact", issues);
  validateSafeArtifactMetadata(artifact.metadata, "artifact.metadata", issues);
  if (issues.length > 0) {
    throw new ProductArtifactStoreError(issues.join("; "), "validation_failed");
  }
}

function storedArtifactFromInput(input: {
  readonly input: ProductArtifactStorageInput;
  readonly checksum: string;
  readonly size_bytes: number;
  readonly uri: string;
  readonly created_at: string;
}): ProductStoredArtifact {
  const artifact: ProductStoredArtifact = {
    artifact_id: input.input.artifact_id,
    run_id: input.input.run_id,
    scenario_id: input.input.scenario_id,
    label: input.input.label,
    type: input.input.type,
    uri: input.uri,
    provider: "local_file",
    size_bytes: input.size_bytes,
    checksum: input.checksum,
    redaction_status: input.input.redaction_status,
    retention_class: input.input.retention_class,
    created_at: input.created_at,
    ...(input.input.content_type ? { content_type: input.input.content_type } : {}),
    ...(input.input.redaction_note ? { redaction_note: input.input.redaction_note } : {}),
    ...(input.input.metadata ? { metadata: input.input.metadata } : {}),
  };
  assertValidStoredProductArtifact(artifact);
  return artifact;
}

function validateIdentity(
  artifact: Pick<ProductArtifactStorageInput, "artifact_id" | "run_id" | "scenario_id" | "label">,
  issues: string[],
): void {
  validateSafeIdentifier("artifact.artifact_id", artifact.artifact_id, issues);
  requireNonEmpty("artifact.run_id", artifact.run_id, issues);
  requireNonEmpty("artifact.scenario_id", artifact.scenario_id, issues);
  requireNonEmpty("artifact.label", artifact.label, issues);
}

function validateSafeIdentifier(pathName: string, value: string, issues: string[]): void {
  requireNonEmpty(pathName, value, issues);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    issues.push(`${pathName} must be a safe artifact identifier`);
  }
}

function requireNonEmpty(pathName: string, value: string, issues: string[]): void {
  if (!value.trim()) issues.push(`${pathName} must be non-empty`);
}

function validateRedactionNote(
  redactionStatus: ProductArtifactStorageInput["redaction_status"],
  redactionNote: string | undefined,
  pathName: string,
  issues: string[],
): void {
  if (redactionStatus === "contains_sensitive_synthetic_data" && !redactionNote?.trim()) {
    issues.push(`${pathName}.redaction_note is required for sensitive synthetic data`);
  }
}

function validateSafeArtifactMetadata(
  metadata: SafeMetadata | undefined,
  pathName: string,
  issues: string[],
): void {
  if (!metadata) return;
  const result = assertLogSafety(metadata);
  if (!result.valid) {
    issues.push(`${pathName} is unsafe: ${result.reason_code}`);
  }
}

function assertSafeArtifactId(artifactId: string): void {
  const issues: string[] = [];
  validateSafeIdentifier("artifact.artifact_id", artifactId, issues);
  if (issues.length > 0) {
    throw new ProductArtifactStoreError(issues.join("; "), "validation_failed");
  }
}

function artifactContentBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? new TextEncoder().encode(content) : content;
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
