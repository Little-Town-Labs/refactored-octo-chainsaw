import { z } from "zod";

const workModeSchema = z.enum(["remote", "hybrid", "onsite"]);
const roleLevelSchema = z.enum([
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "manager",
  "director",
  "vp",
  "exec",
]);

export interface ParseResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly errors: Record<string, string[]>;
}

export interface SeekerIntentInput {
  readonly role_family: string;
  readonly comp_band_min: number;
  readonly comp_band_max: number;
  readonly currency: string;
  readonly jurisdictions: string[];
  readonly work_mode: "remote" | "hybrid" | "onsite";
  readonly flags: string[];
}

export interface EmployerRequisitionInput {
  readonly role_title: string;
  readonly role_level:
    | "intern"
    | "junior"
    | "mid"
    | "senior"
    | "staff"
    | "principal"
    | "manager"
    | "director"
    | "vp"
    | "exec";
  readonly comp_band_min: number;
  readonly comp_band_max: number;
  readonly currency: string;
  readonly jurisdictions: string[];
  readonly work_mode: "remote" | "hybrid" | "onsite";
  readonly headcount_total: number;
  readonly flags: string[];
}

const seekerIntentSchema = z
  .object({
    role_family: z.string().trim().min(1),
    comp_band_min: z.coerce.number().int().nonnegative(),
    comp_band_max: z.coerce.number().int().nonnegative(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/),
    jurisdictions: z.array(z.string().trim().min(1)).min(1),
    work_mode: workModeSchema,
    flags: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((value) => value.comp_band_min <= value.comp_band_max, {
    path: ["comp_band_max"],
    message: "comp_band_max must be greater than or equal to comp_band_min",
  });

const employerRequisitionSchema = z
  .object({
    role_title: z.string().trim().min(1),
    role_level: roleLevelSchema,
    comp_band_min: z.coerce.number().int().nonnegative(),
    comp_band_max: z.coerce.number().int().nonnegative(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/),
    jurisdictions: z.array(z.string().trim().min(1)).min(1),
    work_mode: workModeSchema,
    headcount_total: z.coerce.number().int().min(1),
    flags: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((value) => value.comp_band_min <= value.comp_band_max, {
    path: ["comp_band_max"],
    message: "comp_band_max must be greater than or equal to comp_band_min",
  });

function stringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function stringList(formData: FormData, key: string): string[] {
  const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
  if (values.length > 1) return values.map((value) => value.trim()).filter(Boolean);
  const first = values[0];
  if (!first) return [];
  return first
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function errorsFor(error: z.ZodError): Record<string, string[]> {
  const flattened = error.flatten();
  return flattened.fieldErrors;
}

export function parseSeekerIntentInput(formData: FormData): ParseResult<SeekerIntentInput> {
  const parsed = seekerIntentSchema.safeParse({
    role_family: stringValue(formData, "role_family"),
    comp_band_min: stringValue(formData, "comp_band_min"),
    comp_band_max: stringValue(formData, "comp_band_max"),
    currency: stringValue(formData, "currency"),
    jurisdictions: stringList(formData, "jurisdictions"),
    work_mode: stringValue(formData, "work_mode"),
    flags: stringList(formData, "flags"),
  });
  if (!parsed.success) return { ok: false, errors: errorsFor(parsed.error) };
  return { ok: true, value: parsed.data, errors: {} };
}

export function parseEmployerRequisitionInput(
  formData: FormData,
): ParseResult<EmployerRequisitionInput> {
  const parsed = employerRequisitionSchema.safeParse({
    role_title: stringValue(formData, "role_title"),
    role_level: stringValue(formData, "role_level"),
    comp_band_min: stringValue(formData, "comp_band_min"),
    comp_band_max: stringValue(formData, "comp_band_max"),
    currency: stringValue(formData, "currency"),
    jurisdictions: stringList(formData, "jurisdictions"),
    work_mode: stringValue(formData, "work_mode"),
    headcount_total: stringValue(formData, "headcount_total"),
    flags: stringList(formData, "flags"),
  });
  if (!parsed.success) return { ok: false, errors: errorsFor(parsed.error) };
  return { ok: true, value: parsed.data, errors: {} };
}
