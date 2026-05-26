import {
  EMPLOYER_API_SCOPES,
  authenticateEmployerApiRequest,
  hashEmployerApiSecret,
  issueEmployerApiCredential,
  type EmployerApiCredentialRecord,
  type EmployerApiCredentialRepo,
} from "../auth";
import { EmployerApiError, errorBody } from "../errors";
import {
  fingerprintRequest,
  runIdempotently,
  type IdempotencyRecord,
  type IdempotencyRepo,
} from "../idempotency";

class MemoryCredentialRepo implements EmployerApiCredentialRepo {
  readonly records = new Map<string, EmployerApiCredentialRecord>();
  readonly used: string[] = [];

  async findActiveBySecretHash(secretHash: string): Promise<EmployerApiCredentialRecord | null> {
    return [...this.records.values()].find((record) => record.secret_hash === secretHash) ?? null;
  }

  async recordUse(credentialId: string): Promise<void> {
    this.used.push(credentialId);
  }

  async insertCredential(
    record: Parameters<EmployerApiCredentialRepo["insertCredential"]>[0],
  ): Promise<EmployerApiCredentialRecord> {
    const inserted: EmployerApiCredentialRecord = {
      credential_id: `cred_`,
      principal_id: record.principal_id,
      display_name: record.display_name,
      org_id: record.org_id,
      secret_hash: record.secret_hash,
      scopes: record.scopes,
      status: "active",
      expires_at: record.expires_at,
    };
    this.records.set(inserted.credential_id, inserted);
    return inserted;
  }

  async listCredentials(): Promise<readonly EmployerApiCredentialRecord[]> {
    return [...this.records.values()];
  }

  async updateCredentialStatus(
    credentialId: string,
    status: EmployerApiCredentialRecord["status"],
  ): Promise<void> {
    const record = this.records.get(credentialId);
    if (record) {
      this.records.set(credentialId, { ...record, status });
    }
  }
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

describe("F23 employer API auth, errors, and idempotency", () => {
  it("authenticates bearer credentials, checks scopes, and records use", async () => {
    const repo = new MemoryCredentialRepo();
    const secret = "sk_emp_test";
    repo.records.set("cred_1", {
      credential_id: "cred_1",
      principal_id: "00000000-0000-0000-0000-000000000001",
      org_id: "00000000-0000-0000-0000-000000000010",
      display_name: "ATS connector",
      secret_hash: hashEmployerApiSecret(secret),
      scopes: [EMPLOYER_API_SCOPES.reqWrite],
      status: "active",
      expires_at: null,
    });

    const principal = await authenticateEmployerApiRequest(
      new Headers({ authorization: `Bearer ${secret}` }),
      repo,
      EMPLOYER_API_SCOPES.reqWrite,
    );

    expect(principal.org_id).toBe("00000000-0000-0000-0000-000000000010");
    expect(repo.used).toEqual(["cred_1"]);
  });

  it("rejects missing scopes with the canonical error shape", async () => {
    const repo = new MemoryCredentialRepo();
    repo.records.set("cred_1", {
      credential_id: "cred_1",
      principal_id: "00000000-0000-0000-0000-000000000001",
      org_id: "00000000-0000-0000-0000-000000000010",
      display_name: "ATS connector",
      secret_hash: hashEmployerApiSecret("sk_emp_test"),
      scopes: [EMPLOYER_API_SCOPES.reqRead],
      status: "active",
      expires_at: null,
    });

    await expect(
      authenticateEmployerApiRequest(
        new Headers({ authorization: "Bearer sk_emp_test" }),
        repo,
        EMPLOYER_API_SCOPES.reqWrite,
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });

    expect(errorBody(new EmployerApiError("forbidden", 403, "Nope"))).toEqual({
      error: { code: "forbidden", message: "Nope" },
    });
  });

  it("issues new credentials with display-once raw secret material", async () => {
    const repo = new MemoryCredentialRepo();
    const issued = await issueEmployerApiCredential(repo, {
      org_id: "00000000-0000-0000-0000-000000000010",
      principal_id: "00000000-0000-0000-0000-000000000001",
      display_name: "Greenhouse",
      scopes: [EMPLOYER_API_SCOPES.reqRead],
      expires_at: null,
    });

    expect(issued.secret).toMatch(/^sk_emp_/);
    expect(issued.credential.secret_hash).toBe(hashEmployerApiSecret(issued.secret));
    expect(await repo.listCredentials()).not.toContain(issued.secret);
  });

  it("replays matching idempotent requests and rejects mismatched bodies", async () => {
    const repo = new MemoryIdempotencyRepo();
    const firstFingerprint = fingerprintRequest({
      method: "POST",
      path: "/reqs",
      body: { title: "One", skills: ["ts", "sql"] },
    });

    const first = await runIdempotently({
      org_id: "org_1",
      credential_id: "cred_1",
      operation: "req.create",
      idempotency_key: "idem_1",
      request_fingerprint: firstFingerprint,
      repo,
      execute: async () => ({ status: 201, body: { req_id: "req_1" } }),
    });

    const replay = await runIdempotently({
      org_id: "org_1",
      credential_id: "cred_1",
      operation: "req.create",
      idempotency_key: "idem_1",
      request_fingerprint: firstFingerprint,
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
    ).rejects.toMatchObject({ code: "conflict", status: 409 });

    expect(first.replayed).toBe(false);
    expect(replay).toMatchObject({ replayed: true, body: { req_id: "req_1" } });
  });
});
