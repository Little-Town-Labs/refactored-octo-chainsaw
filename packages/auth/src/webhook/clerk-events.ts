// F02 T022 — Clerk webhook event schemas (Zod, FR-2, EC-1, EC-2).
//
// Clerk webhook payloads are validated at ingress so a malformed or
// tampered payload is rejected before any DB write. We cover the
// minimum event set F02 needs:
//
//   - user.created / user.updated / user.deleted
//   - organizationMembership.created / .deleted
//   - session.removed (used by FR-34 member-removal flow)
//
// We deliberately do NOT model fields we don't consume — Clerk adds
// fields over time and an over-tight schema would break on every
// upstream change. The schema mirrors `passthrough()` semantics for
// non-essential fields.

import { z } from "zod";

const clerkUserId = z.string().min(1).startsWith("user_");
const clerkOrgId = z.string().min(1).startsWith("org_");

const userPayload = z
  .object({
    id: clerkUserId,
    primary_email_address_id: z.string().nullable().optional(),
    email_addresses: z
      .array(
        z
          .object({
            id: z.string(),
            email_address: z.string().email().optional(),
          })
          .loose(),
      )
      .optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
  })
  .loose();

const organizationMembershipPayload = z
  .object({
    organization: z
      .object({
        id: clerkOrgId,
        name: z.string().optional(),
        slug: z.string().optional(),
      })
      .loose(),
    public_user_data: z
      .object({
        user_id: clerkUserId,
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
      })
      .loose(),
    role: z.string().min(1),
  })
  .loose();

const sessionPayload = z
  .object({
    id: z.string().min(1),
    user_id: clerkUserId,
  })
  .loose();

export const clerkWebhookEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user.created"), data: userPayload }),
  z.object({ type: z.literal("user.updated"), data: userPayload }),
  z.object({ type: z.literal("user.deleted"), data: userPayload }),
  z.object({
    type: z.literal("organizationMembership.created"),
    data: organizationMembershipPayload,
  }),
  z.object({
    type: z.literal("organizationMembership.updated"),
    data: organizationMembershipPayload,
  }),
  z.object({
    type: z.literal("organizationMembership.deleted"),
    data: organizationMembershipPayload,
  }),
  z.object({ type: z.literal("session.removed"), data: sessionPayload }),
]);

export type ClerkWebhookEvent = z.infer<typeof clerkWebhookEventSchema>;
export type ClerkWebhookEventType = ClerkWebhookEvent["type"];

export class ClerkWebhookPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClerkWebhookPayloadError";
  }
}

/**
 * Parse a Clerk webhook payload. Throws `ClerkWebhookPayloadError`
 * if the payload does not match a supported event shape; the error
 * carries no Clerk-internal details so log messages don't leak.
 */
export function parseClerkWebhookEvent(rawJson: unknown): ClerkWebhookEvent {
  const result = clerkWebhookEventSchema.safeParse(rawJson);
  if (!result.success) {
    throw new ClerkWebhookPayloadError(
      "Webhook payload did not match a supported Clerk event shape.",
    );
  }
  return result.data;
}
