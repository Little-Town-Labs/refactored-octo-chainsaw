import type { EmployerApiPrincipal } from "../auth";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  disableWebhookEndpoint,
  listWebhookEndpoints,
  type WebhookEndpointRepo,
  type WebhookEndpointResource,
} from "../webhook-endpoints";

class MemoryWebhookEndpointRepo implements WebhookEndpointRepo {
  readonly rows = new Map<string, WebhookEndpointResource>();

  async create(
    orgId: string,
    input: Parameters<WebhookEndpointRepo["create"]>[1],
  ): Promise<WebhookEndpointResource> {
    const row: WebhookEndpointResource = {
      webhook_endpoint_id: `webhook_${this.rows.size + 1}`,
      org_id: orgId,
      url: input.url,
      ...(input.description ? { description: input.description } : {}),
      subscribed_events: input.subscribed_events,
      status: "active",
      created_at: new Date("2026-05-25T12:00:00Z").toISOString(),
    };
    this.rows.set(row.webhook_endpoint_id, row);
    return row;
  }

  async list(orgId: string): Promise<readonly WebhookEndpointResource[]> {
    return [...this.rows.values()].filter((row) => row.org_id === orgId);
  }

  async updateStatus(
    orgId: string,
    endpointId: string,
    status: "disabled" | "deleted",
  ): Promise<WebhookEndpointResource | null> {
    const row = this.rows.get(endpointId);
    if (!row || row.org_id !== orgId) return null;
    const updated = { ...row, status };
    this.rows.set(endpointId, updated);
    return updated;
  }
}

describe("F23 webhook endpoint lifecycle", () => {
  it("creates, lists, disables, and deletes org-scoped endpoints", async () => {
    const repo = new MemoryWebhookEndpointRepo();
    const principal: EmployerApiPrincipal = {
      kind: "service",
      principal_id: "00000000-0000-0000-0000-000000000001",
      credential_id: "cred_1",
      org_id: "org_1",
      display_name: "ATS",
      scopes: ["employer.webhook.write"],
    };

    const created = await createWebhookEndpoint(repo, principal, {
      url: "https://hooks.example.com/spyglass",
      subscribed_events: ["match.notification.created"],
    });
    const disabled = await disableWebhookEndpoint(repo, principal, created.webhook_endpoint_id);
    const deleted = await deleteWebhookEndpoint(repo, principal, created.webhook_endpoint_id);

    expect(await listWebhookEndpoints(repo, principal)).toHaveLength(1);
    expect(disabled).toMatchObject({ status: "disabled" });
    expect(deleted).toMatchObject({ status: "deleted" });
  });
});
