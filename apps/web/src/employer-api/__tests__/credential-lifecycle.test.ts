import {
  EMPLOYER_API_SCOPES,
  issueEmployerApiCredential,
  revokeEmployerApiCredential,
  rotateEmployerApiCredential,
  type EmployerApiCredentialRecord,
  type EmployerApiCredentialRepo,
} from "../auth";

class MemoryCredentialRepo implements EmployerApiCredentialRepo {
  readonly records = new Map<string, EmployerApiCredentialRecord>();

  async findActiveBySecretHash(): Promise<EmployerApiCredentialRecord | null> {
    return null;
  }

  async recordUse(): Promise<void> {}

  async insertCredential(
    record: Parameters<EmployerApiCredentialRepo["insertCredential"]>[0],
  ): Promise<EmployerApiCredentialRecord> {
    const inserted: EmployerApiCredentialRecord = {
      credential_id: `cred_${this.records.size + 1}`,
      principal_id: record.principal_id,
      org_id: record.org_id,
      display_name: record.display_name,
      secret_hash: record.secret_hash,
      scopes: record.scopes,
      status: "active",
      expires_at: record.expires_at,
    };
    this.records.set(inserted.credential_id, inserted);
    return inserted;
  }

  async listCredentials(orgId: string): Promise<readonly EmployerApiCredentialRecord[]> {
    return [...this.records.values()].filter((record) => record.org_id === orgId);
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

describe("F23 employer API credential lifecycle", () => {
  it("issues, rotates, lists, and revokes credentials without returning raw secret on list", async () => {
    const repo = new MemoryCredentialRepo();
    const base = {
      org_id: "00000000-0000-0000-0000-000000000010",
      principal_id: "00000000-0000-0000-0000-000000000001",
      display_name: "ATS",
      scopes: [EMPLOYER_API_SCOPES.reqRead],
      expires_at: null,
    };

    const issued = await issueEmployerApiCredential(repo, base);
    const rotated = await rotateEmployerApiCredential(repo, issued.credential.credential_id, {
      ...base,
      display_name: "ATS rotated",
    });
    await revokeEmployerApiCredential(repo, rotated.credential.credential_id);

    const listed = await repo.listCredentials(base.org_id);
    expect(issued.secret).toMatch(/^sk_emp_/);
    expect(rotated.secret).toMatch(/^sk_emp_/);
    expect(listed.map((record) => record.status)).toEqual(["rotating", "revoked"]);
    expect(JSON.stringify(listed)).not.toContain(issued.secret);
    expect(JSON.stringify(listed)).not.toContain(rotated.secret);
  });
});
