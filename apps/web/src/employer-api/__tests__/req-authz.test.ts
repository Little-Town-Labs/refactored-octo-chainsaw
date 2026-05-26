import {
  EMPLOYER_API_SCOPES,
  authenticateEmployerApiRequest,
  hashEmployerApiSecret,
  type EmployerApiCredentialRecord,
  type EmployerApiCredentialRepo,
} from "../auth";
import {
  readEmployerReqFromApi,
  type EmployerReqRepo,
  type EmployerReqResource,
} from "../req-service";

class MemoryCredentialRepo implements EmployerApiCredentialRepo {
  constructor(private readonly credential: EmployerApiCredentialRecord | null) {}

  async findActiveBySecretHash(secretHash: string): Promise<EmployerApiCredentialRecord | null> {
    return this.credential?.secret_hash === secretHash ? this.credential : null;
  }

  async recordUse(): Promise<void> {}

  async insertCredential(): Promise<EmployerApiCredentialRecord> {
    throw new Error("not used");
  }

  async listCredentials(): Promise<readonly EmployerApiCredentialRecord[]> {
    return this.credential ? [this.credential] : [];
  }

  async updateCredentialStatus(): Promise<void> {}
}

class MemoryReqRepo implements EmployerReqRepo {
  readonly rows = new Map<string, EmployerReqResource>([
    [
      "req_1",
      {
        req_id: "req_1",
        org_id: "org_2",
        title: "Hidden",
        description: "Cross-org",
        status: "open",
        updated_at: new Date("2026-05-25T12:00:00Z").toISOString(),
      },
    ],
  ]);

  async create(): Promise<EmployerReqResource> {
    throw new Error("not used");
  }

  async list(): Promise<readonly EmployerReqResource[]> {
    return [...this.rows.values()];
  }

  async find(orgId: string, reqId: string): Promise<EmployerReqResource | null> {
    const row = this.rows.get(reqId);
    return row?.org_id === orgId ? row : null;
  }

  async update(): Promise<EmployerReqResource | null> {
    throw new Error("not used");
  }

  async close(): Promise<EmployerReqResource | null> {
    throw new Error("not used");
  }
}

function credential(
  overrides: Partial<EmployerApiCredentialRecord> = {},
): EmployerApiCredentialRecord {
  return {
    credential_id: "cred_1",
    principal_id: "00000000-0000-0000-0000-000000000001",
    org_id: "org_1",
    display_name: "ATS",
    secret_hash: hashEmployerApiSecret("sk_emp_test"),
    scopes: [EMPLOYER_API_SCOPES.reqRead],
    status: "active",
    expires_at: null,
    ...overrides,
  };
}

describe("F23 req API authorization", () => {
  it("rejects anonymous, wrong-scope, expired, and revoked requests", async () => {
    await expect(
      authenticateEmployerApiRequest(
        new Headers(),
        new MemoryCredentialRepo(null),
        EMPLOYER_API_SCOPES.reqRead,
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await expect(
      authenticateEmployerApiRequest(
        new Headers({ authorization: "Bearer sk_emp_test" }),
        new MemoryCredentialRepo(credential({ scopes: [EMPLOYER_API_SCOPES.webhookRead] })),
        EMPLOYER_API_SCOPES.reqRead,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      authenticateEmployerApiRequest(
        new Headers({ authorization: "Bearer sk_emp_test" }),
        new MemoryCredentialRepo(credential({ expires_at: new Date("2026-05-25T00:00:00Z") })),
        EMPLOYER_API_SCOPES.reqRead,
        new Date("2026-05-25T12:00:00Z"),
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await expect(
      authenticateEmployerApiRequest(
        new Headers({ authorization: "Bearer sk_emp_test" }),
        new MemoryCredentialRepo(credential({ status: "revoked" })),
        EMPLOYER_API_SCOPES.reqRead,
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("hides cross-organization reqs as not found", async () => {
    const principal = {
      kind: "service" as const,
      principal_id: "00000000-0000-0000-0000-000000000001",
      credential_id: "cred_1",
      org_id: "org_1",
      display_name: "ATS",
      scopes: [EMPLOYER_API_SCOPES.reqRead],
    };

    await expect(
      readEmployerReqFromApi(new MemoryReqRepo(), principal, "req_1"),
    ).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
