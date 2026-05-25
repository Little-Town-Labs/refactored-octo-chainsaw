import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type {
  DossierProjectionRow,
  DossierSignatureRow,
  EmployerReqTicketRow,
  MatchTicketRow,
} from "@spyglass/db";

import { CandidateDetailView, candidateDossierProjectionPayload } from "../candidate-detail-view";
import { CandidateInboxView } from "../candidate-inbox-view";
import type { CandidateInboxEntry } from "../types";

jest.mock("next/link", () => {
  const Link = ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link };
});

function req(): EmployerReqTicketRow {
  return {
    employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
    principal_id: "11111111-1111-4111-8111-000000000001",
    org_id: "11111111-1111-4111-8111-000000000101",
    identifier: "ER-2026-00001",
    state: "open",
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

function match(): MatchTicketRow {
  return {
    match_ticket_id: "11111111-1111-4111-8111-000000000401",
    identifier: "MT-2026-00001",
    seeker_ticket_id: "11111111-1111-4111-8111-000000000201",
    employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
    state: "delivered",
    round: 1,
    round_cap: 3,
    run_id: "11111111-1111-4111-8111-000000000501",
    attempt: 1,
    seeker_contract_id: "seeker",
    seeker_contract_version: "1",
    employer_contract_id: "employer",
    employer_contract_version: "1",
    privacy_ruleset_id: "privacy",
    privacy_ruleset_version: "1",
    decision_locus_jurisdiction: "US-CA",
    flags: [],
    dossier_id: "11111111-1111-4111-8111-000000000601",
    created_at: new Date(0),
    updated_at: new Date("2026-05-25T00:00:00Z"),
    disabled_at: null,
  };
}

function projection(): DossierProjectionRow {
  return {
    projection_id: "11111111-1111-4111-8111-000000000701",
    dossier_id: "11111111-1111-4111-8111-000000000601",
    audience: "employer",
    disclosure_stage: "delivered",
    ruleset_id: "privacy",
    ruleset_version: "1",
    payload: {
      summary: "Approved summary",
      strengths: ["TypeScript"],
      raw_transcript: "never render",
    },
    payload_hash: "hash",
    created_at: new Date(0),
  };
}

function signature(): DossierSignatureRow {
  return {
    signature_id: "11111111-1111-4111-8111-000000000801",
    dossier_id: "11111111-1111-4111-8111-000000000601",
    algorithm: "Ed25519",
    kid: "kid-1",
    canonicalization_version: "1",
    signed_content_hash: "hash",
    signature: "sig",
    signed_at: new Date(0),
    audit_event_id: null,
    created_at: new Date(0),
  };
}

function entry(overrides: Partial<CandidateInboxEntry> = {}): CandidateInboxEntry {
  return {
    match: match(),
    employer_req: req(),
    projection: projection(),
    signature: signature(),
    ...overrides,
  };
}

describe("candidate views", () => {
  it("renders delivered candidate inbox rows and pagination", () => {
    render(<CandidateInboxView rows={[entry()]} next_cursor="50" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("MT-2026-00001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next page/i })).toHaveAttribute("href", "?cursor=50");
  });

  it("renders signature warning when metadata is unavailable", () => {
    render(<CandidateDetailView entry={entry({ signature: null })} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/signature unavailable/i);
  });

  it("allowlists employer dossier projection fields", () => {
    expect(candidateDossierProjectionPayload(projection().payload)).toEqual({
      summary: "Approved summary",
      strengths: ["TypeScript"],
    });
  });
});
