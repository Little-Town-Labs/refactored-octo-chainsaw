import { createHash } from "node:crypto";

import { z } from "zod";

import {
  DISCLOSURE_CLASSES,
  TOOL_STATUSES,
  TOOL_SURFACE_SIDES,
  type JsonObject,
  type ToolDescriptorVersion,
  type ToolSurfaceDescriptorRef,
  type ToolSurfaceVersion,
} from "./types.js";

const refPattern = /^[a-z][a-z0-9_-]*$/;
const toolNamePattern = /^[a-z][a-z0-9_]*$/;

export const toolDescriptorMaterialSchema = z.object({
  name: z.string().regex(toolNamePattern),
  version: z.string().min(1),
  input_schema: z.record(z.string(), z.unknown()),
  output_schema: z.record(z.string(), z.unknown()),
  disclosure_class: z.enum(DISCLOSURE_CLASSES),
  adapter_ref: z.string().min(1),
  description: z.string().min(1),
});

export type ToolDescriptorMaterial = z.infer<typeof toolDescriptorMaterialSchema>;

export const toolSurfaceMaterialSchema = z.object({
  surface_id: z.string().regex(refPattern),
  version: z.string().min(1),
  side_scope: z.enum(TOOL_SURFACE_SIDES),
  description: z.string().min(1),
  descriptor_refs: z
    .array(
      z.object({
        name: z.string().regex(toolNamePattern),
        version: z.string().min(1),
        required: z.boolean().default(true),
        advertisement_order: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export type ToolSurfaceMaterial = z.infer<typeof toolSurfaceMaterialSchema>;

export function validateDescriptorMaterial(input: ToolDescriptorMaterial): ToolDescriptorMaterial {
  return toolDescriptorMaterialSchema.parse(input);
}

export function validateSurfaceMaterial(input: ToolSurfaceMaterial): ToolSurfaceMaterial {
  const material = toolSurfaceMaterialSchema.parse(input);
  const seen = new Set<string>();
  for (const ref of material.descriptor_refs) {
    const key = descriptorKey(ref);
    if (seen.has(key)) throw new Error(`duplicate descriptor ref ${key}`);
    seen.add(key);
  }
  return material;
}

export function computeDescriptorContentHash(input: ToolDescriptorMaterial): string {
  return `sha256:${hashCanonical(validateDescriptorMaterial(input))}`;
}

export function computeSurfaceContentHash(input: ToolSurfaceMaterial): string {
  return `sha256:${hashCanonical(validateSurfaceMaterial(input))}`;
}

export function descriptorRef(descriptor: ToolDescriptorVersion): {
  name: string;
  version: string;
} {
  return { name: descriptor.name, version: descriptor.version };
}

export function surfaceRef(surface: ToolSurfaceVersion): { id: string; version: string } {
  return { id: surface.surface_id, version: surface.version };
}

export function descriptorKey(ref: { readonly name: string; readonly version: string }): string {
  return `${ref.name}@${ref.version}`;
}

export function surfaceKey(ref: { readonly id: string; readonly version: string }): string {
  return `${ref.id}@${ref.version}`;
}

export function validatePublishedDescriptor(descriptor: ToolDescriptorVersion): void {
  if (!TOOL_STATUSES.includes(descriptor.status)) throw new Error("invalid descriptor status");
  validateDescriptorMaterial(toDescriptorMaterial(descriptor));
}

export function validatePublishedSurface(surface: ToolSurfaceVersion): void {
  if (!TOOL_STATUSES.includes(surface.status)) throw new Error("invalid surface status");
  validateSurfaceMaterial(toSurfaceMaterial(surface));
}

export function validateJsonSchemaPayload(
  schema: Record<string, unknown>,
  payload: JsonObject,
): boolean {
  if (schema.type === "object" && typeof payload !== "object") return false;
  const required = Array.isArray(schema.required) ? schema.required : [];
  return required.every((field) => typeof field === "string" && field in payload);
}

function toDescriptorMaterial(descriptor: ToolDescriptorVersion): ToolDescriptorMaterial {
  return {
    name: descriptor.name,
    version: descriptor.version,
    input_schema: descriptor.input_schema,
    output_schema: descriptor.output_schema,
    disclosure_class: descriptor.disclosure_class,
    adapter_ref: descriptor.adapter_ref,
    description: descriptor.description,
  };
}

function toSurfaceMaterial(surface: ToolSurfaceVersion): ToolSurfaceMaterial {
  return {
    surface_id: surface.surface_id,
    version: surface.version,
    side_scope: surface.side_scope,
    description: surface.description,
    descriptor_refs: [...surface.descriptor_refs] as ToolSurfaceDescriptorRef[],
  };
}

function hashCanonical(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
