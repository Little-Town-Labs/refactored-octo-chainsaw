import {
  EMPLOYER_API_SCOPES,
  hashEmployerApiSecret,
  type EmployerApiCredentialRecord,
  type EmployerApiCredentialRepo,
} from "../auth";
import {
  handleCreateWebhookEndpoint,
  handleDeleteWebhookEndpoint,
  handleDisableWebhookEndpoint,
  handleListWebhookEndpoints,
  type WebhookHandlerDeps,
} from "../webhook-handlers";
import type { WebhookEndpointRepo, WebhookEndpointResource } from "../webhook-endpoints";

class TestResponse {
  constructor(
    private readonly body: unknown,
    readonly init: ResponseInit = {},
  ) {}

  get status(): number {
    return this.init.status ?? 200;
  }

  async json(): Promise<unknown> {
    return this.body;
  }

  static json(body: unknown, init: ResponseInit = {}): TestResponse {
    return new TestResponse(body, init);
  }
}

class MemoryCredentialRepo implements EmployerApiCredentialRepo {
  readonly credential: EmployerApiCredentialRecord = {
    credential_id: "cred_1",
    principal_id: "00000000-0000-0000-0000-000000000001",
    org_id: "org_1",
    display_name: "ATS",
    secret_hash: hashEmployerApiSecret("sk_emp_test"),
    scopes: [EMPLOYER_API_SCOPES.webhookRead, EMPLOYER_API_SCOPES.webhookWrite],
    status: "active",
    expires_at: null,
  };

  async findActiveBySecretHash(secretHash: string): Promise<EmployerApiCredentialRecord | null> {
    return secretHash === this.credential.secret_hash ? this.credential : null;
  }

  async recordUse(): Promise<void> {}

  async insertCredential(): Promise<EmployerApiCredentialRecord> {
    throw new Error("not used");
  }

  async listCredentials(): Promise<readonly EmployerApiCredentialRecord[]> {
    return [this.credential];
  }

  async updateCredentialStatus(): Promise<void> {}
}

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

function deps(): WebhookHandlerDeps {
  return {
    credentials: new MemoryCredentialRepo(),
    endpoints: new MemoryWebhookEndpointRepo(),
  };
}

function jsonRequest(method: string, body?: unknown): Request {
  return {
    method,
    headers: new Headers({
      authorization: "Bearer sk_emp_test",
      "content-type": "application/json",
    }),
    json: async () => body,
  } as unknown as Request;
}

describe("F23 webhook route handlers", () => {
  beforeAll(() => {
    global.Response = TestResponse as unknown as typeof Response;
  });

  it("handles endpoint list/create/disable/delete", async () => {
    const handlerDeps = deps();
    const createResponse = await handleCreateWebhookEndpoint(
      jsonRequest("POST", {
        url: "https://hooks.example.com/spyglass",
        subscribed_events: ["match.notification.created"],
      }),
      handlerDeps,
    );
    const created = (await createResponse.json()) as WebhookEndpointResource;

    const listResponse = await handleListWebhookEndpoints(jsonRequest("GET"), handlerDeps);
    const disableResponse = await handleDisableWebhookEndpoint(
      jsonRequest("PATCH"),
      handlerDeps,
      created.webhook_endpoint_id,
    );
    const deleteResponse = await handleDeleteWebhookEndpoint(
      jsonRequest("DELETE"),
      handlerDeps,
      created.webhook_endpoint_id,
    );

    await expect(listResponse.json()).resolves.toMatchObject({
      data: [{ webhook_endpoint_id: created.webhook_endpoint_id }],
    });
    await expect(disableResponse.json()).resolves.toMatchObject({ status: "disabled" });
    expect(createResponse.status).toBe(201);
    expect(deleteResponse.status).toBe(204);
  });
});
