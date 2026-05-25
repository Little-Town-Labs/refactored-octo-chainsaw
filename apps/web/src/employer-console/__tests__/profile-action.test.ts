import type { HumanPrincipal } from "@spyglass/auth";
import type { EmployerOrganizationProfileRow } from "@spyglass/db";

import { saveEmployerProfileForPrincipal } from "../employer-profile-action";
import type { EmployerProfileRepo } from "../profile-repo";

jest.mock("../../auth/get-principal", () => ({ getPrincipal: jest.fn() }));

function principal(overrides: Partial<HumanPrincipal> = {}): HumanPrincipal {
  return {
    kind: "human",
    principal_id: "11111111-1111-4111-8111-000000000001",
    issued_at: 1,
    correlation_id: "corr",
    tier: "employer_admin",
    external_idp: "clerk",
    external_id: "user",
    org_id: "11111111-1111-4111-8111-000000000101",
    ...overrides,
  };
}

function profileForm(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const values = {
    company_name: "Acme",
    company_summary: "Builds hiring tools",
    mission: "Match well",
    culture: "Clear",
    benefits: "Health",
    workplace_policy: "Remote",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function row(): EmployerOrganizationProfileRow {
  return {
    profile_id: "11111111-1111-4111-8111-000000000201",
    org_id: "11111111-1111-4111-8111-000000000101",
    company_name: "Acme",
    company_summary: "Builds hiring tools",
    mission: "Match well",
    culture: "Clear",
    benefits: "Health",
    workplace_policy: "Remote",
    updated_by: "11111111-1111-4111-8111-000000000001",
    created_at: new Date(0),
    updated_at: new Date(0),
  };
}

describe("saveEmployerProfileForPrincipal", () => {
  it("saves profile data under the caller organization", async () => {
    const repo: EmployerProfileRepo = {
      getByOrg: jest.fn(),
      upsert: jest.fn().mockResolvedValue(row()),
    };
    await expect(
      saveEmployerProfileForPrincipal(principal(), profileForm(), repo),
    ).resolves.toEqual({
      status: "success",
      id: "11111111-1111-4111-8111-000000000201",
    });
    expect(repo.upsert).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-000000000101",
      expect.objectContaining({ principal_id: "11111111-1111-4111-8111-000000000001" }),
      expect.objectContaining({ company_name: "Acme" }),
    );
  });

  it("rejects non-admin mutation without repository access", async () => {
    const repo: EmployerProfileRepo = { getByOrg: jest.fn(), upsert: jest.fn() };
    await expect(
      saveEmployerProfileForPrincipal(principal({ tier: "employer_member" }), profileForm(), repo),
    ).resolves.toMatchObject({ status: "error" });
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
