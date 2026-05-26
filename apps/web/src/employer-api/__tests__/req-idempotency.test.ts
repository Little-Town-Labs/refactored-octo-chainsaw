import {
  fingerprintRequest,
  runIdempotently,
  type IdempotencyRecord,
  type IdempotencyRepo,
} from "../idempotency";

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

describe("F23 req idempotency", () => {
  it("returns exact replay responses and conflicts on mismatched bodies", async () => {
    const repo = new MemoryIdempotencyRepo();
    const request = { title: "Backend Engineer" };
    const fingerprint = fingerprintRequest({ method: "POST", path: "/reqs", body: request });

    const created = await runIdempotently({
      org_id: "org_1",
      credential_id: "cred_1",
      operation: "req.create",
      idempotency_key: "idem_1",
      request_fingerprint: fingerprint,
      repo,
      execute: async () => ({ status: 201, body: { req_id: "req_1" } }),
    });
    const replayed = await runIdempotently({
      org_id: "org_1",
      credential_id: "cred_1",
      operation: "req.create",
      idempotency_key: "idem_1",
      request_fingerprint: fingerprint,
      repo,
      execute: async () => ({ status: 201, body: { req_id: "req_2" } }),
    });

    await expect(
      runIdempotently({
        org_id: "org_1",
        credential_id: "cred_1",
        operation: "req.create",
        idempotency_key: "idem_1",
        request_fingerprint: fingerprintRequest({
          method: "POST",
          path: "/reqs",
          body: { title: "Changed" },
        }),
        repo,
        execute: async () => ({ status: 201, body: { req_id: "req_3" } }),
      }),
    ).rejects.toMatchObject({ code: "conflict" });

    expect(created.replayed).toBe(false);
    expect(replayed).toMatchObject({ status: 201, body: { req_id: "req_1" }, replayed: true });
  });
});
