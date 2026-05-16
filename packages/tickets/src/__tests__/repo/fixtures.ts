import type { HumanPrincipal, ServicePrincipal } from "@spyglass/auth";
import type { EmployerReqTicketRow, MatchTicketRow, SeekerTicketRow } from "@spyglass/db";

import { TEST_NOW, testUuid } from "./memory-store.js";

export const seekerPrincipal: HumanPrincipal = {
  kind: "human",
  principal_id: testUuid(9001),
  issued_at: 1,
  correlation_id: "corr-seeker",
  tier: "seeker",
  external_idp: "clerk",
  external_id: "user_seeker",
};

export const employerPrincipal: HumanPrincipal = {
  kind: "human",
  principal_id: testUuid(9002),
  issued_at: 1,
  correlation_id: "corr-employer",
  tier: "employer_admin",
  external_idp: "clerk",
  external_id: "user_employer",
  org_id: testUuid(8001),
};

export const operatorPrincipal: HumanPrincipal = {
  kind: "human",
  principal_id: testUuid(9003),
  issued_at: 1,
  correlation_id: "corr-operator",
  tier: "operator",
  external_idp: "clerk",
  external_id: "user_operator",
  org_id: testUuid(8002),
};

export const matcherPrincipal: ServicePrincipal = {
  kind: "service",
  principal_id: testUuid(9004),
  issued_at: 1,
  correlation_id: "corr-matcher",
  service_name: "matcher",
  service_version: "test",
  scopes: ["tickets.match.advance"],
};

export function seekerRow(overrides: Partial<SeekerTicketRow> = {}): SeekerTicketRow {
  return {
    seeker_ticket_id: testUuid(101),
    principal_id: seekerPrincipal.principal_id,
    identifier: "ST-2026-00001",
    state: "draft",
    role_family: "engineering",
    comp_band_min: 100000,
    comp_band_max: 150000,
    currency: "USD",
    jurisdictions: ["US-CA"],
    work_mode: "remote",
    flags: [],
    created_at: TEST_NOW,
    updated_at: TEST_NOW,
    disabled_at: null,
    ...overrides,
  };
}

export function employerReqRow(
  overrides: Partial<EmployerReqTicketRow> = {},
): EmployerReqTicketRow {
  return {
    employer_req_ticket_id: testUuid(201),
    principal_id: employerPrincipal.principal_id,
    org_id: employerPrincipal.org_id!,
    identifier: "ER-2026-00001",
    state: "draft",
    role_title: "Senior Engineer",
    role_level: "senior",
    comp_band_min: 120000,
    comp_band_max: 180000,
    currency: "USD",
    jurisdictions: ["US-CA"],
    work_mode: "remote",
    headcount_total: 1,
    headcount_filled: 0,
    flags: [],
    created_at: TEST_NOW,
    updated_at: TEST_NOW,
    disabled_at: null,
    ...overrides,
  };
}

export function matchRow(overrides: Partial<MatchTicketRow> = {}): MatchTicketRow {
  return {
    match_ticket_id: testUuid(301),
    identifier: "MT-2026-00001",
    seeker_ticket_id: testUuid(101),
    employer_req_ticket_id: testUuid(201),
    state: "created",
    round: 0,
    round_cap: 3,
    run_id: null,
    attempt: 1,
    seeker_contract_id: "seeker-contract",
    seeker_contract_version: "1",
    employer_contract_id: "employer-contract",
    employer_contract_version: "1",
    privacy_ruleset_id: "ruleset",
    privacy_ruleset_version: "1",
    decision_locus_jurisdiction: "US-CA",
    flags: [],
    dossier_id: null,
    created_at: TEST_NOW,
    updated_at: TEST_NOW,
    disabled_at: null,
    ...overrides,
  };
}
