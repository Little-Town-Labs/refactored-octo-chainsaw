// F02 T060 — Tests for `<SignOutConfirmationView />`.
//
// Five flow shapes the view must render distinctly:
//   1. Non-operator target, first call — single-step copy
//   2. Operator target, first call — "second operator required" notice
//   3. Operator target, second-operator path (approval_id from URL)
//   4. Pending state (operator just got back the approval_id)
//   5. Form submission carries the right hidden fields in each path

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { SignOutConfirmationView } from "../sign-out-confirmation-view.js";

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

const PID = "11111111-1111-7111-8111-111111111111";
const APPROVAL = "22222222-2222-7222-8222-222222222222";
const noop = () => {};

const baseProps = {
  targetPrincipalId: PID,
  secondOperatorHrefBase: `/operator/console/credentials/${PID}/sign-out`,
  action: noop,
  cancelHref: "/operator/console/credentials",
};

describe("<SignOutConfirmationView />", () => {
  it("non-operator target renders single-step copy + button", () => {
    render(<SignOutConfirmationView {...baseProps} targetTier="seeker" />);
    expect(screen.getByRole("heading", { name: /sign out all sessions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out all sessions/i })).toBeInTheDocument();
    // No two-operator notice when the target isn't an operator.
    expect(screen.queryByText(/second operator/i)).not.toBeInTheDocument();
  });

  it("operator target without approval_id shows pending-approval warning + initiate button", () => {
    render(<SignOutConfirmationView {...baseProps} targetTier="operator" />);
    expect(
      screen.getByRole("heading", { name: /initiate sign-out \(operator target\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/second operator must approve/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /initiate sign-out/i })).toBeInTheDocument();
    // No hidden approval_id field on the first call.
    const form = screen.getByRole("form");
    const hidden = form.querySelector<HTMLInputElement>('input[name="approval_id"]');
    expect(hidden).toBeNull();
  });

  it("operator target with approval_id (second-operator path) shows approve button + hidden field", () => {
    render(
      <SignOutConfirmationView {...baseProps} targetTier="operator" approvalIdFromUrl={APPROVAL} />,
    );
    expect(
      screen.getByRole("heading", { name: /approve sign-out \(second operator\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/you are the/i)).toBeInTheDocument();
    expect(screen.getByText(/orchestrator will reject this approval/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve and sign out/i })).toBeInTheDocument();
    const form = screen.getByRole("form");
    const hidden = form.querySelector<HTMLInputElement>('input[name="approval_id"]');
    expect(hidden?.value).toBe(APPROVAL);
  });

  it("pending state renders the approval id + second-operator link", () => {
    const expiresAt = Math.floor(Date.parse("2026-05-10T01:00:00Z") / 1000);
    render(
      <SignOutConfirmationView
        {...baseProps}
        targetTier="operator"
        pendingApprovalId={APPROVAL}
        pendingExpiresAt={expiresAt}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /sign-out pending second-operator approval/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(APPROVAL)).toBeInTheDocument();
    expect(
      screen.getByText(`/operator/console/credentials/${PID}/sign-out?approval_id=${APPROVAL}`),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to credentials/i })).toBeInTheDocument();
    // Pending state must NOT render the submission form or any button —
    // the operator's action this turn is to share the link, not submit.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("renders all four reason codes in the radio group", () => {
    render(<SignOutConfirmationView {...baseProps} targetTier="seeker" />);
    expect(screen.getByLabelText("session_compromise")).toBeInTheDocument();
    expect(screen.getByLabelText("operator_emergency")).toBeInTheDocument();
    expect(screen.getByLabelText("credential_rotation")).toBeInTheDocument();
    expect(screen.getByLabelText("compliance_action")).toBeInTheDocument();
  });

  it("renders form hidden fields: target_principal_id + confirm=yes always", () => {
    render(<SignOutConfirmationView {...baseProps} targetTier="seeker" />);
    const form = screen.getByRole("form");
    const target = form.querySelector<HTMLInputElement>('input[name="target_principal_id"]');
    const confirm = form.querySelector<HTMLInputElement>('input[name="confirm"]');
    expect(target?.value).toBe(PID);
    expect(confirm?.value).toBe("yes");
  });
});
