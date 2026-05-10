// F02 T058 — Tests for `<RevokeConfirmationView />`.

import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { AgentCredentialListRow } from "@spyglass/auth";

import { RevokeConfirmationView } from "../revoke-confirmation-view.js";

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

const PID = "00000000-0000-0000-0000-00000000a001";
const noopAction = () => {};

function row(overrides: Partial<AgentCredentialListRow> = {}): AgentCredentialListRow {
  return {
    credential_id: "00000000-0000-0000-0000-00000000c001",
    principal_id: PID,
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

describe("<RevokeConfirmationView />", () => {
  it("renders the principal id and lists the live credentials that will be revoked", () => {
    render(
      <RevokeConfirmationView
        principalId={PID}
        liveCredentials={[row(), row({ credential_id: "00000000-0000-0000-0000-00000000c002" })]}
        action={noopAction}
        cancelHref="/operator/console/credentials"
      />,
    );

    expect(screen.getByRole("heading", { name: /revoke agent credentials/i })).toBeInTheDocument();
    expect(screen.getByText(PID)).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText(/will be revoked \(2\)/)).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(3); // header + 2 rows
  });

  it("disables the submit button and shows the empty-state message when there are no live credentials", () => {
    render(
      <RevokeConfirmationView
        principalId={PID}
        liveCredentials={[]}
        action={noopAction}
        cancelHref="/operator/console/credentials"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/nothing to revoke/i);
    const submit = screen.getByRole("button", { name: /revoke credentials/i });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-disabled", "true");
  });

  it("renders all four reason codes as radios with NONE pre-selected (deliberate selection required)", () => {
    render(
      <RevokeConfirmationView
        principalId={PID}
        liveCredentials={[row()]}
        action={noopAction}
        cancelHref="/back"
      />,
    );
    const reasons = screen.getAllByRole("radio");
    expect(reasons.map((r) => r.getAttribute("value"))).toEqual([
      "run_cancelled",
      "compromise_suspected",
      "operator_emergency",
      "scope_violation_detected",
    ]);
    for (const r of reasons) expect(r).not.toBeChecked();
    for (const r of reasons) expect(r).toBeRequired();
  });

  it("includes hidden inputs that gate the orchestrator call", () => {
    const { container } = render(
      <RevokeConfirmationView
        principalId={PID}
        liveCredentials={[row()]}
        action={noopAction}
        cancelHref="/back"
      />,
    );
    const principalIdInput = container.querySelector('input[name="principal_id"]');
    const confirmInput = container.querySelector('input[name="confirm"]');
    expect(principalIdInput).toHaveAttribute("type", "hidden");
    expect(principalIdInput).toHaveAttribute("value", PID);
    expect(confirmInput).toHaveAttribute("type", "hidden");
    expect(confirmInput).toHaveAttribute("value", "yes");
  });

  it("renders a Cancel link pointing to the cancelHref", () => {
    render(
      <RevokeConfirmationView
        principalId={PID}
        liveCredentials={[row()]}
        action={noopAction}
        cancelHref="/operator/console/credentials"
      />,
    );
    const cancel = screen.getByRole("link", { name: /cancel/i });
    expect(cancel).toHaveAttribute("href", "/operator/console/credentials");
  });

  it("includes a notes textarea capped at 500 chars", () => {
    render(
      <RevokeConfirmationView
        principalId={PID}
        liveCredentials={[row()]}
        action={noopAction}
        cancelHref="/back"
      />,
    );
    const notes = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
    expect(notes).toHaveAttribute("maxlength", "500");
  });
});
