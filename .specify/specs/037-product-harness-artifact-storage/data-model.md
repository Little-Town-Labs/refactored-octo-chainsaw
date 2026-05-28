# Data Model: PTH12 Durable Artifact Storage

## ProductStoredArtifact

Metadata returned after artifact bytes are stored.

| Field | Type | Notes |
| --- | --- | --- |
| `artifact_id` | `string` | Stable identity, safe path segment |
| `run_id` | `string` | Product run that produced the artifact |
| `scenario_id` | `string` | Scenario that produced the artifact |
| `label` | `string` | Human-readable label |
| `type` | `ArtifactType` | Existing artifact type enum |
| `uri` | `string` | Durable object URI or local durable URI |
| `provider` | `ProductArtifactStorageProvider` | `local_file`, `vercel_blob`, `s3_compatible`, or `other` |
| `content_type` | `string?` | MIME type when known |
| `size_bytes` | `number` | Persisted byte length |
| `checksum` | `string` | `sha256:<hex>` |
| `redaction_status` | `ArtifactRedactionStatus` | Existing redaction enum |
| `redaction_note` | `string?` | Required when synthetic sensitive data is retained |
| `retention_class` | `ProductArtifactRetentionClass` | `ephemeral`, `ci_artifact`, `canary_history`, or `release_evidence` |
| `created_at` | `string` | ISO timestamp |
| `metadata` | `SafeMetadata?` | Safe structured metadata only |

## ProductArtifactStorageInput

Store request containing artifact identity, payload bytes, content type, retention class, redaction status, and safe metadata.

## Relationship to Neon

Neon result snapshots store `RunArtifact` records with durable URI, checksum, and metadata. Payload bytes remain in durable object storage.
