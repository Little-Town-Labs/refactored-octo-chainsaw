import { randomUUID } from "node:crypto";

import type {
  AiRuntimeManifest,
  ManifestRef,
  ModelInvocationRecord,
  ModelProfileVersion,
  ModelRef,
  NewAiRuntimeManifest,
  NewModelInvocationRecord,
  NewModelProfileVersion,
  NewPromptVersion,
  PromptRef,
  PromptVersion,
} from "./types.js";

export interface AiRepository {
  getPromptVersion(ref: PromptRef): Promise<PromptVersion | null>;
  insertPromptVersion(input: NewPromptVersion): Promise<PromptVersion>;
  getModelProfileVersion(ref: ModelRef): Promise<ModelProfileVersion | null>;
  insertModelProfileVersion(input: NewModelProfileVersion): Promise<ModelProfileVersion>;
  getRuntimeManifest(ref: ManifestRef): Promise<AiRuntimeManifest | null>;
  insertRuntimeManifest(input: NewAiRuntimeManifest): Promise<AiRuntimeManifest>;
  appendInvocationRecord(input: NewModelInvocationRecord): Promise<ModelInvocationRecord>;
  updateInvocationRecord(input: ModelInvocationRecord): Promise<ModelInvocationRecord>;
  listPromptVersions(): Promise<readonly PromptVersion[]>;
  listModelProfileVersions(): Promise<readonly ModelProfileVersion[]>;
  listRuntimeManifests(): Promise<readonly AiRuntimeManifest[]>;
  listInvocationRecords(): Promise<readonly ModelInvocationRecord[]>;
}

export class MemoryAiRepository implements AiRepository {
  readonly prompts = new Map<string, PromptVersion>();
  readonly models = new Map<string, ModelProfileVersion>();
  readonly manifests = new Map<string, AiRuntimeManifest>();
  readonly invocations = new Map<string, ModelInvocationRecord>();

  async getPromptVersion(ref: PromptRef): Promise<PromptVersion | null> {
    return this.prompts.get(promptKey(ref)) ?? null;
  }

  async insertPromptVersion(input: NewPromptVersion): Promise<PromptVersion> {
    const row: PromptVersion = {
      ...input,
      prompt_version_id: input.prompt_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.prompts.set(promptKey(row), row);
    return row;
  }

  async getModelProfileVersion(ref: ModelRef): Promise<ModelProfileVersion | null> {
    return this.models.get(modelKey(ref)) ?? null;
  }

  async insertModelProfileVersion(input: NewModelProfileVersion): Promise<ModelProfileVersion> {
    const row: ModelProfileVersion = {
      ...input,
      model_profile_version_id: input.model_profile_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.models.set(modelKey(row), row);
    return row;
  }

  async getRuntimeManifest(ref: ManifestRef): Promise<AiRuntimeManifest | null> {
    return this.manifests.get(manifestKey(ref)) ?? null;
  }

  async insertRuntimeManifest(input: NewAiRuntimeManifest): Promise<AiRuntimeManifest> {
    const row: AiRuntimeManifest = {
      ...input,
      runtime_manifest_id: input.runtime_manifest_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.manifests.set(manifestKey(row), row);
    return row;
  }

  async appendInvocationRecord(input: NewModelInvocationRecord): Promise<ModelInvocationRecord> {
    const row: ModelInvocationRecord = {
      ...input,
      invocation_id: input.invocation_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.invocations.set(row.invocation_id, row);
    return row;
  }

  async updateInvocationRecord(input: ModelInvocationRecord): Promise<ModelInvocationRecord> {
    this.invocations.set(input.invocation_id, input);
    return input;
  }

  async listPromptVersions(): Promise<readonly PromptVersion[]> {
    return [...this.prompts.values()];
  }

  async listModelProfileVersions(): Promise<readonly ModelProfileVersion[]> {
    return [...this.models.values()];
  }

  async listRuntimeManifests(): Promise<readonly AiRuntimeManifest[]> {
    return [...this.manifests.values()];
  }

  async listInvocationRecords(): Promise<readonly ModelInvocationRecord[]> {
    return [...this.invocations.values()];
  }
}

export function promptKey(ref: PromptRef): string {
  return `${ref.prompt_id}@${ref.version}`;
}

export function modelKey(ref: ModelRef): string {
  return `${ref.model_profile_id}@${ref.version}`;
}

export function manifestKey(ref: ManifestRef): string {
  return `${ref.manifest_id}@${ref.version}`;
}
