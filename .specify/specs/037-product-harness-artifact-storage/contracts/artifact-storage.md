# Contract: Durable Artifact Storage

## Public API

```ts
type ProductArtifactRetentionClass =
  | "ephemeral"
  | "ci_artifact"
  | "canary_history"
  | "release_evidence";

type ProductArtifactStorageProvider =
  | "local_file"
  | "vercel_blob"
  | "s3_compatible"
  | "other";

interface ProductArtifactStorageInput {
  artifact_id: string;
  run_id: string;
  scenario_id: string;
  label: string;
  type: ArtifactType;
  content: string | Uint8Array;
  content_type?: string;
  redaction_status: ArtifactRedactionStatus;
  redaction_note?: string;
  retention_class: ProductArtifactRetentionClass;
  metadata?: SafeMetadata;
}

interface ProductStoredArtifact {
  artifact_id: string;
  run_id: string;
  scenario_id: string;
  label: string;
  type: ArtifactType;
  uri: string;
  provider: ProductArtifactStorageProvider;
  content_type?: string;
  size_bytes: number;
  checksum: string;
  redaction_status: ArtifactRedactionStatus;
  redaction_note?: string;
  retention_class: ProductArtifactRetentionClass;
  created_at: string;
  metadata?: SafeMetadata;
}

interface ProductArtifactStore {
  saveArtifact(input: ProductArtifactStorageInput): Promise<ProductArtifactStoreSaveResult>;
  getArtifactMetadata(artifactId: string): Promise<ProductStoredArtifact | undefined>;
}
```

## Behavior

- Identical duplicate writes return `{ created: false, idempotent: true }`.
- Conflicting duplicate writes throw `ProductArtifactStoreError` with code `duplicate_conflict`.
- Invalid input throws before any file/object write.
- `toRunArtifact` converts stored metadata to the existing result-store artifact shape.
