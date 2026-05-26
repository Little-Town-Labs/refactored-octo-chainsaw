import type { ServicePrincipal } from "@spyglass/auth";
import {
  employerApiCredentials,
  employerApiIdempotencyRecords,
  employerReqTickets,
  employerWebhookEndpoints,
  type Db,
  type EmployerReqTicketRow,
} from "@spyglass/db";
import { and, desc, eq, gt } from "drizzle-orm";

import type {
  EmployerApiCredentialRecord,
  EmployerApiCredentialRepo,
  EmployerApiPrincipal,
  NewEmployerApiCredential,
} from "./auth";
import type { IdempotencyRecord, IdempotencyRepo } from "./idempotency";
import type { EmployerReqRepo, EmployerReqResource } from "./req-service";
import type {
  EmployerReqCloseInput,
  EmployerReqCreateInput,
  EmployerReqUpdateInput,
} from "./schemas";
import type { WebhookEndpointRepo, WebhookEndpointResource } from "./webhook-endpoints";

export class DrizzleEmployerApiCredentialRepo implements EmployerApiCredentialRepo {
  constructor(private readonly db: Db) {}

  async findActiveBySecretHash(secretHash: string): Promise<EmployerApiCredentialRecord | null> {
    const rows = await this.db
      .select()
      .from(employerApiCredentials)
      .where(eq(employerApiCredentials.secret_hash, secretHash))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      credential_id: row.credential_id,
      org_id: row.org_id,
      principal_id: row.principal_id,
      display_name: row.display_name,
      secret_hash: row.secret_hash,
      scopes: row.scopes,
      status: row.status as EmployerApiCredentialRecord["status"],
      expires_at: row.expires_at,
    };
  }

  async recordUse(credentialId: string, usedAt: Date): Promise<void> {
    await this.db
      .update(employerApiCredentials)
      .set({ last_used_at: usedAt, updated_at: usedAt })
      .where(eq(employerApiCredentials.credential_id, credentialId));
  }

  async insertCredential(record: NewEmployerApiCredential): Promise<EmployerApiCredentialRecord> {
    const [row] = await this.db
      .insert(employerApiCredentials)
      .values({
        ...record,
        scopes: [...record.scopes],
        created_by_principal_id: record.principal_id,
      })
      .returning();
    if (!row) throw new Error("failed to insert employer API credential");
    return {
      credential_id: row.credential_id,
      org_id: row.org_id,
      principal_id: row.principal_id,
      display_name: row.display_name,
      secret_hash: row.secret_hash,
      scopes: row.scopes,
      status: row.status as EmployerApiCredentialRecord["status"],
      expires_at: row.expires_at,
    };
  }

  async listCredentials(orgId: string): Promise<readonly EmployerApiCredentialRecord[]> {
    const rows = await this.db
      .select()
      .from(employerApiCredentials)
      .where(eq(employerApiCredentials.org_id, orgId))
      .orderBy(desc(employerApiCredentials.created_at));
    return rows.map((row) => ({
      credential_id: row.credential_id,
      org_id: row.org_id,
      principal_id: row.principal_id,
      display_name: row.display_name,
      secret_hash: row.secret_hash,
      scopes: row.scopes,
      status: row.status as EmployerApiCredentialRecord["status"],
      expires_at: row.expires_at,
    }));
  }

  async updateCredentialStatus(
    credentialId: string,
    status: EmployerApiCredentialRecord["status"],
    now: Date,
  ): Promise<void> {
    await this.db
      .update(employerApiCredentials)
      .set({
        status,
        updated_at: now,
        ...(status === "revoked" ? { revoked_at: now } : {}),
      })
      .where(eq(employerApiCredentials.credential_id, credentialId));
  }
}

export class DrizzleIdempotencyRepo implements IdempotencyRepo {
  constructor(private readonly db: Db) {}

  async find(
    orgId: string,
    operation: string,
    idempotencyKey: string,
    now: Date,
  ): Promise<IdempotencyRecord | null> {
    const rows = await this.db
      .select()
      .from(employerApiIdempotencyRecords)
      .where(
        and(
          eq(employerApiIdempotencyRecords.org_id, orgId),
          eq(employerApiIdempotencyRecords.operation, operation),
          eq(employerApiIdempotencyRecords.idempotency_key, idempotencyKey),
          gt(employerApiIdempotencyRecords.expires_at, now),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      org_id: row.org_id,
      credential_id: row.credential_id,
      operation: row.operation,
      idempotency_key: row.idempotency_key,
      request_fingerprint: row.request_fingerprint,
      response_status: row.response_status,
      response_body: row.response_body,
      response_body_hash: row.response_body_hash,
      ...(row.resource_type ? { resource_type: row.resource_type } : {}),
      ...(row.resource_id ? { resource_id: row.resource_id } : {}),
      expires_at: row.expires_at,
    };
  }

  async insert(record: IdempotencyRecord): Promise<void> {
    await this.db.insert(employerApiIdempotencyRecords).values({
      org_id: record.org_id,
      credential_id: record.credential_id,
      operation: record.operation,
      idempotency_key: record.idempotency_key,
      request_fingerprint: record.request_fingerprint,
      response_status: record.response_status,
      response_body: record.response_body as Record<string, unknown>,
      response_body_hash: record.response_body_hash,
      ...(record.resource_type ? { resource_type: record.resource_type } : {}),
      ...(record.resource_id ? { resource_id: record.resource_id } : {}),
      expires_at: record.expires_at,
    });
  }
}

export class DrizzleEmployerReqApiRepo implements EmployerReqRepo {
  constructor(
    private readonly db: Db,
    private readonly allocateIdentifier: () => Promise<string>,
  ) {}

  async create(
    orgId: string,
    input: EmployerReqCreateInput,
    actor: EmployerApiPrincipal,
  ): Promise<EmployerReqResource> {
    const [row] = await this.db
      .insert(employerReqTickets)
      .values({
        principal_id: actor.principal_id,
        org_id: orgId,
        identifier: await this.allocateIdentifier(),
        state: "open",
        role_title: input.title,
        role_level: input.role_level ?? "mid",
        comp_band_min: input.compensation_min ?? 0,
        comp_band_max: input.compensation_max ?? input.compensation_min ?? 0,
        currency: "USD",
        jurisdictions: [input.location ?? "US"],
        decision_locus_jurisdiction: input.location ?? "US",
        work_mode: input.work_mode ?? "remote",
        headcount_total: 1,
        headcount_filled: 0,
        threshold: 75,
        flags: input.must_have_skills,
      })
      .returning();
    if (!row) throw new Error("failed to insert employer req");
    return reqResourceFromRow(row, input.description, input.external_req_id);
  }

  async list(orgId: string): Promise<readonly EmployerReqResource[]> {
    const rows = await this.db
      .select()
      .from(employerReqTickets)
      .where(eq(employerReqTickets.org_id, orgId))
      .orderBy(desc(employerReqTickets.created_at))
      .limit(100);
    return rows.map((row) => reqResourceFromRow(row));
  }

  async find(orgId: string, reqId: string): Promise<EmployerReqResource | null> {
    const rows = await this.db
      .select()
      .from(employerReqTickets)
      .where(
        and(
          eq(employerReqTickets.org_id, orgId),
          eq(employerReqTickets.employer_req_ticket_id, reqId),
        ),
      )
      .limit(1);
    return rows[0] ? reqResourceFromRow(rows[0]) : null;
  }

  async update(
    orgId: string,
    reqId: string,
    input: EmployerReqUpdateInput,
  ): Promise<EmployerReqResource | null> {
    const [row] = await this.db
      .update(employerReqTickets)
      .set({
        ...(input.title ? { role_title: input.title } : {}),
        ...(input.role_level ? { role_level: input.role_level } : {}),
        ...(input.compensation_min !== undefined ? { comp_band_min: input.compensation_min } : {}),
        ...(input.compensation_max !== undefined ? { comp_band_max: input.compensation_max } : {}),
        ...(input.work_mode ? { work_mode: input.work_mode } : {}),
        ...(input.location
          ? { decision_locus_jurisdiction: input.location, jurisdictions: [input.location] }
          : {}),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(employerReqTickets.org_id, orgId),
          eq(employerReqTickets.employer_req_ticket_id, reqId),
        ),
      )
      .returning();
    return row ? reqResourceFromRow(row, input.description, input.external_req_id) : null;
  }

  async close(
    orgId: string,
    reqId: string,
    input: EmployerReqCloseInput,
  ): Promise<EmployerReqResource | null> {
    const [row] = await this.db
      .update(employerReqTickets)
      .set({
        state: input.reason === "filled" ? "filled" : "closed",
        updated_at: new Date(),
      })
      .where(
        and(
          eq(employerReqTickets.org_id, orgId),
          eq(employerReqTickets.employer_req_ticket_id, reqId),
        ),
      )
      .returning();
    return row ? reqResourceFromRow(row) : null;
  }
}

export class DrizzleWebhookEndpointRepo implements WebhookEndpointRepo {
  constructor(private readonly db: Db) {}

  async create(
    orgId: string,
    input: Parameters<WebhookEndpointRepo["create"]>[1],
    actor: EmployerApiPrincipal,
  ): Promise<WebhookEndpointResource> {
    const [row] = await this.db
      .insert(employerWebhookEndpoints)
      .values({
        org_id: orgId,
        url: input.url,
        ...(input.description ? { description: input.description } : {}),
        subscribed_events: [...input.subscribed_events],
        status: "active",
        created_by_principal_id: actor.principal_id,
      })
      .returning();
    if (!row) throw new Error("failed to insert webhook endpoint");
    return webhookEndpointFromRow(row);
  }

  async list(orgId: string): Promise<readonly WebhookEndpointResource[]> {
    const rows = await this.db
      .select()
      .from(employerWebhookEndpoints)
      .where(eq(employerWebhookEndpoints.org_id, orgId))
      .orderBy(desc(employerWebhookEndpoints.created_at));
    return rows.map(webhookEndpointFromRow);
  }

  async updateStatus(
    orgId: string,
    endpointId: string,
    status: "disabled" | "deleted",
    actor: EmployerApiPrincipal,
  ): Promise<WebhookEndpointResource | null> {
    const now = new Date();
    const [row] = await this.db
      .update(employerWebhookEndpoints)
      .set({
        status,
        updated_by_principal_id: actor.principal_id,
        updated_at: now,
        ...(status === "disabled" ? { disabled_at: now } : { deleted_at: now }),
      })
      .where(
        and(
          eq(employerWebhookEndpoints.org_id, orgId),
          eq(employerWebhookEndpoints.webhook_endpoint_id, endpointId),
        ),
      )
      .returning();
    return row ? webhookEndpointFromRow(row) : null;
  }
}

export const noopEmployerReqAuditSink = {
  emit: async () => {},
};

export function servicePrincipalFromEmployerApi(principal: EmployerApiPrincipal): ServicePrincipal {
  return {
    kind: "service",
    principal_id: principal.principal_id,
    service_name: "employer-api",
    service_version: "1.0.0",
    scopes: principal.scopes,
    issued_at: Math.floor(Date.now() / 1000),
    correlation_id: principal.credential_id,
  };
}

function reqResourceFromRow(
  row: EmployerReqTicketRow,
  description = "",
  externalReqId?: string,
): EmployerReqResource {
  return {
    req_id: row.employer_req_ticket_id,
    org_id: row.org_id,
    ...(externalReqId ? { external_req_id: externalReqId } : {}),
    title: row.role_title,
    description,
    status:
      row.state === "filled" || row.state === "closed" || row.state === "withdrawn"
        ? "closed"
        : "open",
    updated_at: row.updated_at.toISOString(),
  };
}

function webhookEndpointFromRow(
  row: typeof employerWebhookEndpoints.$inferSelect,
): WebhookEndpointResource {
  return {
    webhook_endpoint_id: row.webhook_endpoint_id,
    org_id: row.org_id,
    url: row.url,
    ...(row.description ? { description: row.description } : {}),
    subscribed_events: row.subscribed_events,
    status: row.status as WebhookEndpointResource["status"],
    created_at: row.created_at.toISOString(),
  };
}
