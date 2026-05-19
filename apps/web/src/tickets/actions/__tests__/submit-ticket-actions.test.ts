import type { HumanPrincipal } from "@spyglass/auth";
import type { EmployerReqTicketRow, SeekerTicketRow } from "@spyglass/db";

import { submitEmployerRequisitionForPrincipal } from "../submit-employer-core";
import { submitSeekerIntentForPrincipal } from "../submit-seeker-core";

const seekerPrincipal: HumanPrincipal = {
  kind: "human",
  principal_id: "11111111-1111-4111-8111-000000000001",
  issued_at: 1,
  correlation_id: "corr-seeker",
  tier: "seeker",
  external_idp: "clerk",
  external_id: "user_seeker",
};

const employerPrincipal: HumanPrincipal = {
  kind: "human",
  principal_id: "11111111-1111-4111-8111-000000000002",
  issued_at: 1,
  correlation_id: "corr-employer",
  tier: "employer_admin",
  external_idp: "clerk",
  external_id: "user_employer",
  org_id: "11111111-1111-4111-8111-000000000102",
};

function seekerForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const values = {
    role_family: "engineering",
    comp_band_min: "100000",
    comp_band_max: "150000",
    currency: "USD",
    jurisdictions: "US-CA,US-NY",
    work_mode: "remote",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

function employerForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const values = {
    role_title: "Senior Engineer",
    role_level: "senior",
    comp_band_min: "120000",
    comp_band_max: "180000",
    currency: "USD",
    jurisdictions: "US-CA",
    work_mode: "remote",
    headcount_total: "3",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

function seekerRow(state: string): SeekerTicketRow {
  return {
    seeker_ticket_id: "11111111-1111-4111-8111-000000000201",
    principal_id: seekerPrincipal.principal_id,
    identifier: "ST-2026-00001",
    state,
    role_family: "engineering",
    comp_band_min: 100000,
    comp_band_max: 150000,
    currency: "USD",
    jurisdictions: ["US-CA"],
    work_mode: "remote",
    flags: [],
    created_at: new Date(0),
    updated_at: new Date(0),
    disabled_at: null,
  };
}

function employerRow(state: string): EmployerReqTicketRow {
  return {
    employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
    principal_id: employerPrincipal.principal_id,
    org_id: employerPrincipal.org_id!,
    identifier: "ER-2026-00001",
    state,
    role_title: "Senior Engineer",
    role_level: "senior",
    comp_band_min: 120000,
    comp_band_max: 180000,
    currency: "USD",
    jurisdictions: ["US-CA"],
    work_mode: "remote",
    headcount_total: 3,
    headcount_filled: 0,
    flags: [],
    created_at: new Date(0),
    updated_at: new Date(0),
    disabled_at: null,
  };
}

describe("ticket submit action cores", () => {
  it("submits a seeker intent through draft creation and submitted transition", async () => {
    const repo = {
      insertDraft: jest.fn().mockResolvedValue(seekerRow("draft")),
      transition: jest.fn().mockResolvedValue(seekerRow("submitted")),
    };

    await expect(
      submitSeekerIntentForPrincipal(seekerPrincipal, seekerForm(), repo),
    ).resolves.toMatchObject({
      status: "success",
      ticket_id: "11111111-1111-4111-8111-000000000201",
      identifier: "ST-2026-00001",
      state: "submitted",
    });
    expect(repo.insertDraft).toHaveBeenCalledWith(
      seekerPrincipal,
      expect.objectContaining({ role_family: "engineering", jurisdictions: ["US-CA", "US-NY"] }),
    );
    expect(repo.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        seeker_ticket_id: seekerRow("draft").seeker_ticket_id,
        to: "submitted",
      }),
    );
  });

  it("rejects bad seeker input before repository calls", async () => {
    const repo = {
      insertDraft: jest.fn(),
      transition: jest.fn(),
    };

    await expect(
      submitSeekerIntentForPrincipal(seekerPrincipal, seekerForm({ comp_band_max: "1" }), repo),
    ).resolves.toMatchObject({ status: "error" });
    expect(repo.insertDraft).not.toHaveBeenCalled();
  });

  it("submits an employer requisition scoped to the caller organization", async () => {
    const repo = {
      insertDraft: jest.fn().mockResolvedValue(employerRow("draft")),
      transition: jest.fn().mockResolvedValue(employerRow("submitted")),
    };

    await expect(
      submitEmployerRequisitionForPrincipal(employerPrincipal, employerForm(), repo),
    ).resolves.toMatchObject({
      status: "success",
      ticket_id: "11111111-1111-4111-8111-000000000301",
      identifier: "ER-2026-00001",
      state: "submitted",
    });
    expect(repo.insertDraft).toHaveBeenCalledWith(
      employerPrincipal,
      expect.objectContaining({ org_id: employerPrincipal.org_id, headcount_total: 3 }),
    );
  });

  it("rejects non-employer-admin callers", async () => {
    const repo = {
      insertDraft: jest.fn(),
      transition: jest.fn(),
    };

    await expect(
      submitEmployerRequisitionForPrincipal(seekerPrincipal, employerForm(), repo),
    ).resolves.toMatchObject({
      status: "error",
      serverError: "Employer admin role required.",
    });
    expect(repo.insertDraft).not.toHaveBeenCalled();
  });
});
