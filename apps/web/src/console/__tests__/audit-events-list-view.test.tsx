// F02 T059 — Tests for `<AuditEventsListView />`.

import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { AuditEventsListRow } from "../../auth/audit-events-list-repo";

import { AuditEventsListView } from "../audit-events-list-view";

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

function row(overrides: Partial<AuditEventsListRow> = {}): AuditEventsListRow {
  return {
    event_id: "00000000-0000-0000-0000-00000000e001",
    event_name: "agent_credential.issued_by_operator",
    principal_id: "00000000-0000-0000-0000-0000000000aa",
    principal_kind: "human",
    role_or_scope: "operator",
    correlation_id: "c-1",
    payload: { credential_id: "cid-1" },
    created_at: new Date("2026-05-09T12:00:00Z"),
    ...overrides,
  };
}

describe("<AuditEventsListView />", () => {
  it("renders empty state with role=status when no rows", () => {
    render(<AuditEventsListView rows={[]} next_cursor={null} params={{}} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no audit events/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row with event name, kind, role, and correlation id", () => {
    render(<AuditEventsListView rows={[row()]} next_cursor={null} params={{}} />);
    const tbody = screen.getByRole("table").querySelector("tbody")!;
    const tr = within(tbody).getAllByRole("row")[0]!;
    expect(within(tr).getByText("agent_credential.issued_by_operator")).toBeInTheDocument();
    expect(within(tr).getByText("human")).toBeInTheDocument();
    expect(within(tr).getByText("operator")).toBeInTheDocument();
    expect(within(tr).getByText("c-1")).toBeInTheDocument();
  });

  it("renders em-dash for null role_or_scope (service/agent rows)", () => {
    render(
      <AuditEventsListView
        rows={[row({ principal_kind: "service", role_or_scope: null })]}
        next_cursor={null}
        params={{}}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows a 'Clear filter' link when filtering by principal_id", () => {
    const pid = "11111111-1111-1111-1111-111111111111";
    render(<AuditEventsListView rows={[]} next_cursor={null} params={{ principal_id: pid }} />);
    const clear = screen.getByRole("link", { name: /clear filter/i });
    expect(clear).toHaveAttribute("href", "?");
  });

  it("renders a Next page link when next_cursor is present", () => {
    render(<AuditEventsListView rows={[row()]} next_cursor="abc" params={{}} />);
    const next = screen.getByRole("link", { name: /next page/i });
    expect(next).toHaveAttribute("href", "?cursor=abc");
    expect(next).toHaveAttribute("rel", "next");
  });

  it("per-row principal cell links to the filtered view (preserves no other state)", () => {
    const pid = "22222222-2222-2222-2222-222222222222";
    render(
      <AuditEventsListView rows={[row({ principal_id: pid })]} next_cursor={null} params={{}} />,
    );
    const link = screen.getByRole("link", { name: new RegExp(`filter by principal ${pid}`, "i") });
    expect(link).toHaveAttribute("href", `?principalId=${pid}`);
  });
});
