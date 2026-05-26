// F23 — Employer webhook endpoints, signing secrets, events, and receipts.
//
// schema-lint: skip-r2-timestamps
// Reason: webhook deliveries are immutable operational/audit evidence.

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { dossierArtifacts } from "./dossiers.js";
import { employerReqTickets } from "./employer-req-tickets.js";
import { matchTickets } from "./match-tickets.js";
import { organizations } from "./organizations.js";
import { principals } from "./principals.js";

export const WEBHOOK_ENDPOINT_STATUSES = ["active", "disabled", "deleted"] as const;
export type WebhookEndpointStatus = (typeof WEBHOOK_ENDPOINT_STATUSES)[number];

export const WEBHOOK_SIGNING_SECRET_STATUSES = ["active", "overlap", "revoked", "expired"] as const;
export type WebhookSigningSecretStatus = (typeof WEBHOOK_SIGNING_SECRET_STATUSES)[number];

export const WEBHOOK_EVENT_TYPES = [
  "match.notification.created",
  "dossier.delivery.created",
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const WEBHOOK_DELIVERY_STATUSES = [
  "pending",
  "delivered",
  "retry_scheduled",
  "terminal_failure",
  "suppressed",
] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

export const WEBHOOK_RESPONSE_CLASSES = [
  "success",
  "client_error",
  "server_error",
  "timeout",
  "network_error",
  "suppressed",
] as const;
export type WebhookResponseClass = (typeof WEBHOOK_RESPONSE_CLASSES)[number];

export const employerWebhookEndpoints = pgTable(
  "employer_webhook_endpoints",
  {
    webhook_endpoint_id: uuid("webhook_endpoint_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.org_id, { onDelete: "no action", onUpdate: "no action" }),
    url: text("url").notNull(),
    description: text("description"),
    subscribed_events: jsonb("subscribed_events").$type<string[]>().notNull(),
    status: text("status").notNull().default("active"),
    current_secret_id: uuid("current_secret_id"),
    retry_policy: text("retry_policy").notNull().default("standard"),
    created_by_principal_id: uuid("created_by_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    updated_by_principal_id: uuid("updated_by_principal_id").references(
      () => principals.principal_id,
    ),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    disabled_at: timestamp("disabled_at", { withTimezone: true }),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check("employer_webhook_endpoints_url_check", sql`${t.url} <> ''`),
    check(
      "employer_webhook_endpoints_events_nonempty",
      sql`jsonb_typeof(${t.subscribed_events}) = 'array' AND jsonb_array_length(${t.subscribed_events}) >= 1`,
    ),
    check(
      "employer_webhook_endpoints_status_check",
      sql`${t.status} IN ('active','disabled','deleted')`,
    ),
    index("employer_webhook_endpoints_org_status_idx").on(t.org_id, t.status, t.created_at.desc()),
  ],
);

export const employerWebhookSigningSecrets = pgTable(
  "employer_webhook_signing_secrets",
  {
    webhook_signing_secret_id: uuid("webhook_signing_secret_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    webhook_endpoint_id: uuid("webhook_endpoint_id")
      .notNull()
      .references(() => employerWebhookEndpoints.webhook_endpoint_id),
    key_id: text("key_id").notNull(),
    secret_hash: text("secret_hash").notNull(),
    encrypted_secret: text("encrypted_secret").notNull(),
    status: text("status").notNull().default("active"),
    active_from: timestamp("active_from", { withTimezone: true }).notNull(),
    active_until: timestamp("active_until", { withTimezone: true }),
    created_by_principal_id: uuid("created_by_principal_id")
      .notNull()
      .references(() => principals.principal_id),
    revoked_by_principal_id: uuid("revoked_by_principal_id").references(
      () => principals.principal_id,
    ),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    check("employer_webhook_signing_secrets_key_id_check", sql`${t.key_id} <> ''`),
    check("employer_webhook_signing_secrets_hash_check", sql`${t.secret_hash} <> ''`),
    check(
      "employer_webhook_signing_secrets_status_check",
      sql`${t.status} IN ('active','overlap','revoked','expired')`,
    ),
    uniqueIndex("employer_webhook_signing_secrets_key_unique_idx").on(t.key_id),
    index("employer_webhook_signing_secrets_endpoint_idx").on(
      t.webhook_endpoint_id,
      t.status,
      t.created_at.desc(),
    ),
  ],
);

export const employerWebhookEvents = pgTable(
  "employer_webhook_events",
  {
    webhook_event_id: uuid("webhook_event_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    org_id: uuid("org_id")
      .notNull()
      .references(() => organizations.org_id),
    event_type: text("event_type").notNull(),
    schema_version: text("schema_version").notNull(),
    employer_req_ticket_id: uuid("employer_req_ticket_id")
      .notNull()
      .references(() => employerReqTickets.employer_req_ticket_id),
    match_ticket_id: uuid("match_ticket_id").references(() => matchTickets.match_ticket_id),
    dossier_id: uuid("dossier_id").references(() => dossierArtifacts.dossier_id),
    payload_hash: text("payload_hash").notNull(),
    delivery_eligible_at: timestamp("delivery_eligible_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check(
      "employer_webhook_events_type_check",
      sql`${t.event_type} IN ('match.notification.created','dossier.delivery.created')`,
    ),
    check("employer_webhook_events_schema_version_check", sql`${t.schema_version} <> ''`),
    check("employer_webhook_events_payload_hash_check", sql`${t.payload_hash} <> ''`),
    index("employer_webhook_events_org_idx").on(t.org_id, t.created_at.desc()),
  ],
);

export const employerWebhookDeliveryReceipts = pgTable(
  "employer_webhook_delivery_receipts",
  {
    delivery_receipt_id: uuid("delivery_receipt_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    webhook_event_id: uuid("webhook_event_id")
      .notNull()
      .references(() => employerWebhookEvents.webhook_event_id),
    webhook_endpoint_id: uuid("webhook_endpoint_id")
      .notNull()
      .references(() => employerWebhookEndpoints.webhook_endpoint_id),
    attempt: integer("attempt").notNull(),
    status: text("status").notNull(),
    request_signature_key_id: text("request_signature_key_id"),
    response_status: integer("response_status"),
    response_class: text("response_class").notNull(),
    next_attempt_at: timestamp("next_attempt_at", { withTimezone: true }),
    last_attempt_at: timestamp("last_attempt_at", { withTimezone: true }),
    acknowledged_at: timestamp("acknowledged_at", { withTimezone: true }),
    terminal_reason: text("terminal_reason"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("employer_webhook_delivery_receipts_attempt_check", sql`${t.attempt} >= 1`),
    check(
      "employer_webhook_delivery_receipts_status_check",
      sql`${t.status} IN ('pending','delivered','retry_scheduled','terminal_failure','suppressed')`,
    ),
    check(
      "employer_webhook_delivery_receipts_response_class_check",
      sql`${t.response_class} IN ('success','client_error','server_error','timeout','network_error','suppressed')`,
    ),
    uniqueIndex("employer_webhook_delivery_receipts_event_endpoint_attempt_idx").on(
      t.webhook_event_id,
      t.webhook_endpoint_id,
      t.attempt,
    ),
    index("employer_webhook_delivery_receipts_retry_idx").on(t.status, t.next_attempt_at),
  ],
);

export type EmployerWebhookEndpointRow = typeof employerWebhookEndpoints.$inferSelect;
export type NewEmployerWebhookEndpointRow = typeof employerWebhookEndpoints.$inferInsert;
export type EmployerWebhookSigningSecretRow = typeof employerWebhookSigningSecrets.$inferSelect;
export type NewEmployerWebhookSigningSecretRow = typeof employerWebhookSigningSecrets.$inferInsert;
export type EmployerWebhookEventRow = typeof employerWebhookEvents.$inferSelect;
export type NewEmployerWebhookEventRow = typeof employerWebhookEvents.$inferInsert;
export type EmployerWebhookDeliveryReceiptRow = typeof employerWebhookDeliveryReceipts.$inferSelect;
export type NewEmployerWebhookDeliveryReceiptRow =
  typeof employerWebhookDeliveryReceipts.$inferInsert;
