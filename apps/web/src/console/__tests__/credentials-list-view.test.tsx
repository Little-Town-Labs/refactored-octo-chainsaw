// F02 T056 — Tests for `<CredentialsListView />`.

import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { AgentCredentialListRow } from "@spyglass/auth";

import { CredentialsListView } from "../credentials-list-view.js";

// Stub `next/link` — under jsdom we don't need its routing behavior;
// rendering a plain anchor preserves the href + accessible-name
// assertions this test cares about.
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

function row(overrides: Partial<AgentCredentialListRow> = {}): AgentCredentialListRow {
  return {
    credential_id: "00000000-0000-0000-0000-00000000c001",
    principal_id: "00000000-0000-0000-0000-0000000000aa",
    run_id: "00000000-0000-0000-0000-00000000ru01",
    side: "seeker",
    contract_id: "c-1",
    contract_version: "v1",
    scope_set: ["dossier.read"],
    issued_at: new Date("2026-05-01T12:00:00Z"),
    expires_at: new Date("2099-01-01T00:00:00Z"),
    revoked_at: null,
    revocation_reason: null,
    ...overrides,
  };
}

describe("<CredentialsListView />", () => {
  it("renders an empty state when no rows are present", () => {
    render(<CredentialsListView rows={[]} next_cursor={null} params={{ status: "all" }} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no credentials/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders one row per credential with key columns", () => {
    render(
      <CredentialsListView
        rows={[row({ credential_id: "00000000-0000-0000-0000-00000000c001" })]}
        next_cursor={null}
        params={{ status: "all" }}
      />,
    );
    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((c) => c.textContent);
    expect(headers).toEqual([
      "Credential",
      "Principal",
      "Contract",
      "Side",
      "Scopes",
      "Issued",
      "Expires",
      "Status",
    ]);
    expect(within(table).getAllByText(/00000000…/).length).toBeGreaterThanOrEqual(2);
    expect(within(table).getByText("seeker")).toBeInTheDocument();
    expect(within(table).getByText("dossier.read")).toBeInTheDocument();
  });

  it("renders 'revoked' status non-color (text label) for revoked rows", () => {
    render(
      <CredentialsListView
        rows={[
          row({
            credential_id: "00000000-0000-0000-0000-00000000c002",
            revoked_at: new Date("2026-05-02T00:00:00Z"),
            revocation_reason: "compromise:test",
          }),
        ]}
        next_cursor={null}
        params={{ status: "all" }}
      />,
    );
    const cell = screen.getByText("revoked");
    expect(cell).toHaveAttribute("data-status", "revoked");
  });

  it("renders 'expired' status when expires_at is in the past and not revoked", () => {
    render(
      <CredentialsListView
        rows={[row({ expires_at: new Date("2000-01-01T00:00:00Z") })]}
        next_cursor={null}
        params={{ status: "all" }}
      />,
    );
    expect(screen.getByText("expired")).toHaveAttribute("data-status", "expired");
  });

  it("renders a 'Next page' link with the cursor preserved when next_cursor is set", () => {
    render(
      <CredentialsListView
        rows={[row()]}
        next_cursor="opaque-cursor-abc"
        params={{ status: "active" }}
      />,
    );
    const nextLink = screen.getByRole("link", { name: /next page/i });
    expect(nextLink).toHaveAttribute("href", expect.stringContaining("cursor=opaque-cursor-abc"));
    expect(nextLink).toHaveAttribute("href", expect.stringContaining("status=active"));
  });

  it("does not render pagination when next_cursor is null", () => {
    render(<CredentialsListView rows={[row()]} next_cursor={null} params={{ status: "all" }} />);
    expect(screen.queryByRole("link", { name: /next page/i })).not.toBeInTheDocument();
  });

  it("marks the active filter with aria-current='page'", () => {
    render(<CredentialsListView rows={[]} next_cursor={null} params={{ status: "active" }} />);
    const active = screen.getByRole("link", { name: "Active" });
    expect(active).toHaveAttribute("aria-current", "page");
    const all = screen.getByRole("link", { name: "All" });
    expect(all).not.toHaveAttribute("aria-current");
  });

  it("links to the same page with cleared cursor when switching filters", () => {
    render(
      <CredentialsListView
        rows={[]}
        next_cursor={null}
        params={{ status: "active", cursor: "page-2-cursor" }}
      />,
    );
    const allLink = screen.getByRole("link", { name: "All" });
    const href = allLink.getAttribute("href") ?? "";
    expect(href).not.toContain("cursor");
  });
});
