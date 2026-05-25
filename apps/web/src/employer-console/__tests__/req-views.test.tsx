import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { EmployerReqTicketRow } from "@spyglass/db";

import { ReqDetailView } from "../req-detail-view";
import { ReqListView } from "../req-list-view";

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

jest.mock("../req-actions", () => ({
  createEmployerReq: jest.fn(),
  amendEmployerReq: jest.fn(),
  closeEmployerReq: jest.fn(),
}));

function row(overrides: Partial<EmployerReqTicketRow> = {}): EmployerReqTicketRow {
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
    headcount_total: 2,
    headcount_filled: 1,
    threshold: 75,
    flags: [],
    created_at: new Date(0),
    updated_at: new Date(0),
    disabled_at: null,
    ...overrides,
  };
}

describe("req views", () => {
  it("renders empty req list state", () => {
    render(<ReqListView rows={[]} next_cursor={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no requisitions/i);
  });

  it("renders req rows with captions, bounded columns, and links", () => {
    render(<ReqListView rows={[row({ state: "closed" })]} next_cursor="50" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Employer requisitions, newest first.")).toBeInTheDocument();
    expect(within(table).getByText("canceled")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next page/i })).toHaveAttribute("href", "?cursor=50");
  });

  it("renders req detail form with decision locus", () => {
    render(<ReqDetailView req={row()} />);
    expect(screen.getByRole("heading", { name: "ER-2026-00001" })).toBeInTheDocument();
    expect(screen.getByLabelText(/decision locus/i)).toHaveValue("US-CA");
  });
});
