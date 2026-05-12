// F02 T057 — Tests for `<IssueCredentialForm />`.

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  IssueCredentialForm,
  type IssueAction,
  type IssueResultState,
} from "../issue-credential-form";

const noopAction: IssueAction = async () => ({ status: "idle" });

describe("<IssueCredentialForm />", () => {
  it("renders all required fields with visible labels", () => {
    render(
      <IssueCredentialForm
        action={noopAction}
        availableScopes={["dossier.read", "dossier.write"]}
      />,
    );

    expect(screen.getByLabelText(/run id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agent principal id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contract id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contract version/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ticket id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ttl/i)).toBeInTheDocument();

    // Scopes rendered as checkboxes from the prop.
    expect(screen.getByLabelText("dossier.read")).toBeInTheDocument();
    expect(screen.getByLabelText("dossier.write")).toBeInTheDocument();

    // Side radios.
    expect(screen.getByLabelText("Seeker")).toBeChecked();
    expect(screen.getByLabelText("Employer")).not.toBeChecked();
  });

  it("renders inline errors with role=alert and aria-errormessage wiring", () => {
    const errored: IssueResultState = {
      status: "error",
      errors: {
        run_id: "Must be a UUID.",
        agent_principal_id: undefined,
        side: undefined,
        contract_id: undefined,
        contract_version: undefined,
        ticket_id: undefined,
        scope_set: "Select at least one scope.",
        ttl_minutes: undefined,
      },
    };
    render(
      <IssueCredentialForm
        action={noopAction}
        availableScopes={["dossier.read"]}
        initialState={errored}
      />,
    );

    const alerts = screen.getAllByRole("alert").map((el) => el.textContent);
    expect(alerts).toEqual(
      expect.arrayContaining(["Must be a UUID.", "Select at least one scope."]),
    );

    const runIdInput = screen.getByLabelText(/run id/i);
    expect(runIdInput).toHaveAttribute("aria-errormessage", "run_id-error");
    expect(runIdInput).toHaveAttribute("aria-invalid", "true");
  });

  it("renders a server-error banner when state carries one", () => {
    const errored: IssueResultState = {
      status: "error",
      serverError: "Conflict — credential already exists.",
      errors: {
        run_id: undefined,
        agent_principal_id: undefined,
        side: undefined,
        contract_id: undefined,
        contract_version: undefined,
        ticket_id: undefined,
        scope_set: undefined,
        ttl_minutes: undefined,
      },
    };
    render(
      <IssueCredentialForm action={noopAction} availableScopes={["x"]} initialState={errored} />,
    );
    const banner = screen.getByText(/credential already exists/i);
    expect(banner).toHaveAttribute("data-status", "server-error");
  });

  it("on success, replaces the form with the once-shown result panel and the will-not-be-shown notice", () => {
    const success: IssueResultState = {
      status: "success",
      jwt: "eyJ.fake.jwt",
      credential_id: "00000000-0000-0000-0000-00000000c001",
      expires_at: 2_000_000_000,
    };
    render(
      <IssueCredentialForm action={noopAction} availableScopes={["x"]} initialState={success} />,
    );

    // Form is gone.
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ticket id/i)).not.toBeInTheDocument();

    // Once-shown notice and JWT visible.
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
    const jwtField = screen.getByLabelText("JWT") as HTMLTextAreaElement;
    expect(jwtField.value).toBe("eyJ.fake.jwt");
    expect(jwtField).toHaveAttribute("readonly");

    // Copy button.
    expect(screen.getByRole("button", { name: /copy to clipboard/i })).toBeInTheDocument();
  });
});
