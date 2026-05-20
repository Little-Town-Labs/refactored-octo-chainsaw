import { createHash } from "node:crypto";

import { z } from "zod";

import type { AgentContractRuntimeSettings, ModelRef, VersionedRef } from "./types.js";

const versionedRefSchema = z.object({
  id: z.string().trim().min(1),
  version: z.string().trim().min(1),
});

const modelRefSchema = z.object({
  provider: z.string().trim().min(1),
  model_id: z.string().trim().min(1),
  version: z.string().trim().min(1),
});

const runtimeSettingsSchema = z
  .object({
    max_rounds: z.number().int().positive().optional(),
    timeout_ms: z.number().int().positive().optional(),
    max_tool_calls_per_turn: z.number().int().nonnegative().optional(),
  })
  .strict();

export interface ContractMaterial {
  readonly contract_id: string;
  readonly version: string;
  readonly side: "seeker" | "employer";
  readonly prompt_template_ref: VersionedRef;
  readonly rubric_ref: VersionedRef;
  readonly tool_surface_ref: VersionedRef;
  readonly model_ref: ModelRef;
  readonly runtime_settings: AgentContractRuntimeSettings;
  readonly extension_fields?: Readonly<Record<string, unknown>>;
  readonly description: string;
}

export type ValidatedContractMaterial = Omit<ContractMaterial, "extension_fields"> & {
  readonly extension_fields: Readonly<Record<string, unknown>>;
};

export const contractMaterialSchema = z
  .object({
    contract_id: z.string().trim().min(1),
    version: z.string().trim().min(1),
    side: z.enum(["seeker", "employer"]),
    prompt_template_ref: versionedRefSchema,
    rubric_ref: versionedRefSchema,
    tool_surface_ref: versionedRefSchema,
    model_ref: modelRefSchema,
    runtime_settings: runtimeSettingsSchema.default({}),
    extension_fields: z.record(z.string(), z.unknown()).default({}),
    description: z.string().trim().min(1),
  })
  .strict();

export class ContractSchemaInvalidError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Agent contract material is invalid: ${issues.join("; ")}`);
    this.name = "ContractSchemaInvalidError";
  }
}

export function validateContractMaterial(input: ContractMaterial): ValidatedContractMaterial {
  const result = contractMaterialSchema.safeParse(input);
  if (!result.success) {
    throw new ContractSchemaInvalidError(result.error.issues.map((issue) => issue.message));
  }
  return result.data as ValidatedContractMaterial;
}

export function computeContractContentHash(input: ContractMaterial): string {
  const material = validateContractMaterial(input);
  return createHash("sha256").update(canonicalize(material)).digest("hex");
}

export function canonicalize(input: unknown): string {
  return JSON.stringify(sortForCanonicalJson(input));
}

function sortForCanonicalJson(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(sortForCanonicalJson);
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([key, value]) => [key, sortForCanonicalJson(value)]));
  }
  return input;
}
