import type { HumanPrincipal } from "@spyglass/auth";
import type { EmployerReqTicketRow } from "@spyglass/db";

import { closeEmployerReqForPrincipal, createEmployerReqForPrincipal } from "../req-actions";

jest.mock("../../auth/get-principal", () => ({ getPrincipal: jest.fn() }));

const admin: HumanPrincipal = {
  kind: "human",
  principal_id: "11111111-1111-4111-8111-000000000001",
  issued_at: 1,
  correlation_id: "corr",
  tier: "employer_admin",
  external_idp: "clerk",
  external_id: "user",
  org_id: "11111111-1111-4111-8111-000000000101",
};

function reqRow(state: string): EmployerReqTicketRow {
  return {
    employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
    principal_id: admin.principal_id,
    org_id: admin.org_id!,
    identifier: "ER-2026-00001",
    state,
    role_title: "Engineer",
    role_level: "senior",
    comp_band_min: 100,
    comp_band_max: 200,
    currency: "USD",
    jurisdictions: ["US-CA"],
    decision_locus_jurisdiction: "US-CA",
    work_mode: "remote",
    headcount_total: 1,
    headcount_filled: 0,
    threshold: 75,
    flags: [],
    created_at: new Date(0),
    updated_at: new Date(0),
    disabled_at: null,
  };
}

function reqForm(): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    role_title: "Engineer",
    role_level: "senior",
    comp_band_min: "100",
    comp_band_max: "200",
    currency: "USD",
    jurisdictions: "US-CA",
    decision_locus_jurisdiction: "US-CA",
    work_mode: "remote",
    headcount_total: "1",
    threshold: "75",
  })) {
    data.set(key, value);
  }
  return data;
}

describe("employer req actions", () => {
  it("creates reqs with threshold and decision locus", async () => {
    const repo = {
      insertDraft: jest.fn().mockResolvedValue(reqRow("draft")),
      transition: jest.fn().mockResolvedValue(reqRow("submitted")),
    };
    await expect(createEmployerReqForPrincipal(admin, reqForm(), repo)).resolves.toMatchObject({
      status: "success",
      identifier: "ER-2026-00001",
    });
    expect(repo.insertDraft).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ threshold: 75, decision_locus_jurisdiction: "US-CA" }),
    );
  });

  it("maps canceled close to internal closed state", async () => {
    const data = new FormData();
    data.set("employer_req_ticket_id", "11111111-1111-4111-8111-000000000301");
    data.set("terminal_state", "closed");
    data.set("reason_code", "cancelled_by_employer");
    const repo = { transition: jest.fn().mockResolvedValue(reqRow("closed")) };
    await expect(closeEmployerReqForPrincipal(admin, data, repo)).resolves.toMatchObject({
      status: "success",
      state: "closed",
    });
    expect(repo.transition).toHaveBeenCalledWith(expect.objectContaining({ to: "closed" }));
  });
});
