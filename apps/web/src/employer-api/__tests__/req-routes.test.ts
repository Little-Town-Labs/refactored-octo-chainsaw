import {
  EMPLOYER_API_SCOPES,
  hashEmployerApiSecret,
  type EmployerApiCredentialRecord,
  type EmployerApiCredentialRepo,
} from "../auth";
import type { IdempotencyRecord, IdempotencyRepo } from "../idempotency";
import {
  handleCloseReq,
  handleCreateReq,
  handleListReqs,
  handleReadReq,
  handleUpdateReq,
  type EmployerReqHandlerDeps,
} from "../req-handlers";
import type { EmployerReqAuditSink, EmployerReqRepo, EmployerReqResource } from "../req-service";

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
    scopes: [EMPLOYER_API_SCOPES.reqRead, EMPLOYER_API_SCOPES.reqWrite],
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

class MemoryIdempotencyRepo implements IdempotencyRepo {
  readonly records = new Map<string, IdempotencyRecord>();

  async find(
    orgId: string,
    operation: string,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null> {
    return this.records.get(`${orgId}:${operation}:${idempotencyKey}`) ?? null;
  }

  async insert(record: IdempotencyRecord): Promise<void> {
    this.records.set(`${record.org_id}:${record.operation}:${record.idempotency_key}`, record);
  }
}

class MemoryReqRepo implements EmployerReqRepo {
  readonly rows = new Map<string, EmployerReqResource>();

  async create(
    orgId: string,
    input: Parameters<EmployerReqRepo["create"]>[1],
  ): Promise<EmployerReqResource> {
    const row: EmployerReqResource = {
      req_id: `req_${this.rows.size + 1}`,
      org_id: orgId,
      title: input.title,
      description: input.description,
      status: "open",
      updated_at: new Date("2026-05-25T12:00:00Z").toISOString(),
    };
    this.rows.set(row.req_id, row);
    return row;
  }

  async list(orgId: string): Promise<readonly EmployerReqResource[]> {
    return [...this.rows.values()].filter((row) => row.org_id === orgId);
  }

  async find(orgId: string, reqId: string): Promise<EmployerReqResource | null> {
    const row = this.rows.get(reqId);
    return row?.org_id === orgId ? row : null;
  }

  async update(
    orgId: string,
    reqId: string,
    input: Parameters<EmployerReqRepo["update"]>[2],
  ): Promise<EmployerReqResource | null> {
    const row = await this.find(orgId, reqId);
    if (!row) return null;
    const updated = {
      ...row,
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
    };
    this.rows.set(reqId, updated);
    return updated;
  }

  async close(orgId: string, reqId: string): Promise<EmployerReqResource | null> {
    const row = await this.find(orgId, reqId);
    if (!row) return null;
    const closed = { ...row, status: "closed" as const };
    this.rows.set(reqId, closed);
    return closed;
  }
}

function deps(): EmployerReqHandlerDeps {
  const audit: EmployerReqAuditSink = { emit: async () => {} };
  return {
    credentials: new MemoryCredentialRepo(),
    idempotency: new MemoryIdempotencyRepo(),
    reqs: new MemoryReqRepo(),
    audit,
  };
}

function jsonRequest(method: string, body?: unknown): Request {
  return {
    method,
    headers: new Headers({
      authorization: "Bearer sk_emp_test",
      "content-type": "application/json",
      "idempotency-key": "idem_1",
    }),
    json: async () => body,
  } as unknown as Request;
}

describe("F23 req route handlers", () => {
  beforeAll(() => {
    global.Response = TestResponse as unknown as typeof Response;
  });

  it("handles create/list/read/update/close through parsed REST requests", async () => {
    const handlerDeps = deps();
    const createResponse = await handleCreateReq(
      jsonRequest("POST", {
        title: "Staff Engineer",
        description: "Build platform",
        must_have_skills: [],
        nice_to_have_skills: [],
      }),
      handlerDeps,
    );
    const created = (await createResponse.json()) as EmployerReqResource;

    const listResponse = await handleListReqs(jsonRequest("GET"), handlerDeps);
    const readResponse = await handleReadReq(jsonRequest("GET"), handlerDeps, created.req_id);
    const updateResponse = await handleUpdateReq(
      jsonRequest("PATCH", { title: "Principal Engineer" }),
      handlerDeps,
      created.req_id,
    );
    const closeResponse = await handleCloseReq(
      jsonRequest("POST", { reason: "filled" }),
      handlerDeps,
      created.req_id,
    );

    await expect(listResponse.json()).resolves.toMatchObject({
      data: [{ req_id: created.req_id }],
    });
    await expect(readResponse.json()).resolves.toMatchObject({ req_id: created.req_id });
    await expect(updateResponse.json()).resolves.toMatchObject({ title: "Principal Engineer" });
    await expect(closeResponse.json()).resolves.toMatchObject({ status: "closed" });
    expect(createResponse.status).toBe(201);
  });
});
