import { z } from "zod";

export const employerApiScopeSchema = z.enum([
  "employer.req.read",
  "employer.req.write",
  "employer.webhook.read",
  "employer.webhook.write",
  "employer.credential.write",
]);

export const employerReqCreateSchema = z.object({
  external_req_id: z.string().min(1).max(128).optional(),
  title: z.string().min(1).max(160),
  department: z.string().max(160).optional(),
  location: z.string().max(160).optional(),
  work_mode: z.enum(["onsite", "hybrid", "remote"]).optional(),
  role_level: z
    .enum([
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
    ])
    .optional(),
  compensation_min: z.number().int().nonnegative().optional(),
  compensation_max: z.number().int().nonnegative().optional(),
  description: z.string().min(1).max(8000),
  must_have_skills: z.array(z.string().min(1).max(80)).max(50).default([]),
  nice_to_have_skills: z.array(z.string().min(1).max(80)).max(50).default([]),
});

export const employerReqUpdateSchema = employerReqCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one req field must be provided.");

export const employerReqCloseSchema = z.object({
  reason: z.enum(["filled", "cancelled", "paused", "duplicate"]),
  note: z.string().max(1000).optional(),
});

export const webhookEventTypeSchema = z.enum([
  "match.notification.created",
  "dossier.delivery.created",
]);

export const webhookEndpointCreateSchema = z.object({
  url: z.string().url(),
  description: z.string().max(240).optional(),
  subscribed_events: z.array(webhookEventTypeSchema).min(1).max(10),
});

export const webhookDeliveryPayloadSchema = z.object({
  event_id: z.string().min(1),
  event_type: webhookEventTypeSchema,
  schema_version: z.string().min(1),
  org_id: z.string().uuid(),
  req_id: z.string().min(1),
  match_id: z.string().min(1).optional(),
  dossier: z.record(z.string(), z.unknown()).optional(),
});

export type EmployerApiScope = z.infer<typeof employerApiScopeSchema>;
export type EmployerReqCreateInput = z.infer<typeof employerReqCreateSchema>;
export type EmployerReqUpdateInput = z.infer<typeof employerReqUpdateSchema>;
export type EmployerReqCloseInput = z.infer<typeof employerReqCloseSchema>;
export type WebhookEndpointCreateInput = z.infer<typeof webhookEndpointCreateSchema>;
export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>;
export type WebhookDeliveryPayload = z.infer<typeof webhookDeliveryPayloadSchema>;
