import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { HumanPrincipal } from "@spyglass/auth";

import type {
  EmployerApiCredentialRecord,
  EmployerApiCredentialRepo,
} from "../../employer-api/auth";
import { EMPLOYER_API_SCOPES } from "../../employer-api/auth";
import type { WebhookEndpointResource } from "../../employer-api/webhook-endpoints";
import { issueIntegrationCredentialForPrincipal } from "../integration-credentials-action";
import { IntegrationCredentialsView } from "../integration-credentials-view";
import { WebhookEndpointsView } from "../webhook-endpoints-view";

jest.mock("../../auth/get-principal", () => ({
  getPrincipal: jest.fn(),
}));

jest.mock("../integration-credentials-action", () => {
  const actual = jest.requireActual("../integration-credentials-action");
  return {
    ...actual,
    issueIntegrationCredentialSubmit: jest.fn(),
  };
});

class MemoryCredentialRepo implements EmployerApiCredentialRepo {
  readonly rows: EmployerApiCredentialRecord[] = [];

  async findActiveBySecretHash(): Promise<EmployerApiCredentialRecord | null> {
    return null;
  }

  async recordUse(): Promise<void> {}

  async insertCredential(
    record: Parameters<EmployerApiCredentialRepo["insertCredential"]>[0],
  ): Promise<EmployerApiCredentialRecord> {
    const row: EmployerApiCredentialRecord = {
      credential_id: `cred_${this.rows.length + 1}`,
      principal_id: record.principal_id,
      org_id: record.org_id,
      display_name: record.display_name,
      secret_hash: record.secret_hash,
      scopes: record.scopes,
      status: "active",
      expires_at: record.expires_at,
    };
    this.rows.push(row);
    return row;
  }

  async listCredentials(orgId: string): Promise<readonly EmployerApiCredentialRecord[]> {
    return this.rows.filter((row) => row.org_id === orgId);
  }

  async updateCredentialStatus(): Promise<void> {}
}

const principal: HumanPrincipal = {
  kind: "human",
  principal_id: "00000000-0000-0000-0000-000000000001",
  external_idp: "clerk",
  external_id: "user_1",
  tier: "employer_admin",
  org_id: "00000000-0000-0000-0000-000000000010",
  issued_at: 1,
  correlation_id: "corr_1",
};
const principalOrgId = "00000000-0000-0000-0000-000000000010";

describe("integration credentials console", () => {
  it("issues an employer API credential and returns one-time secret material", async () => {
    const formData = new FormData();
    formData.set("display_name", "Greenhouse");
    formData.append("scopes", EMPLOYER_API_SCOPES.reqRead);

    const repo = new MemoryCredentialRepo();
    const result = await issueIntegrationCredentialForPrincipal(principal, formData, repo);

    expect(result).toMatchObject({ status: "success", id: "cred_1" });
    expect(result.secret).toMatch(/^sk_emp_/);
    expect(JSON.stringify(await repo.listCredentials(principalOrgId))).not.toContain(result.secret);
  });

  it("renders credential list without raw secret material", () => {
    render(
      <IntegrationCredentialsView
        credentials={[
          {
            credential_id: "cred_1",
            principal_id: principal.principal_id,
            org_id: principalOrgId,
            display_name: "Greenhouse",
            secret_hash: "sha256:hidden",
            scopes: [EMPLOYER_API_SCOPES.reqRead],
            status: "active",
            expires_at: null,
          },
        ]}
      />,
    );

    const table = screen.getByRole("table");
    expect(within(table).getByText("Greenhouse")).toBeInTheDocument();
    expect(
      within(table).getByText("Employer API credentials. Raw secret material is never listed."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^sk_emp_/)).not.toBeInTheDocument();
  });

  it("renders webhook endpoint management state", () => {
    const endpoints: WebhookEndpointResource[] = [
      {
        webhook_endpoint_id: "endpoint_1",
        org_id: principalOrgId,
        url: "https://hooks.example.com/spyglass",
        subscribed_events: ["match.notification.created"],
        status: "active",
        created_at: "2026-05-25T12:00:00.000Z",
      },
    ];

    render(<WebhookEndpointsView endpoints={endpoints} />);

    expect(screen.getByRole("heading", { name: "Webhook endpoints" })).toBeInTheDocument();
    expect(screen.getByText("https://hooks.example.com/spyglass")).toBeInTheDocument();
  });
});
