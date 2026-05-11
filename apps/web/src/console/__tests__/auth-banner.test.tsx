// F02 T061 — Tests for `<AuthBanner />` and the kind-selector.
//
//  - Rendering: each kind shows expected heading + body + reset
//    button (when wired); ARIA role matches kind semantics
//    (status for form_invalid, alert otherwise); heading level is
//    configurable.
//  - Enumeration resistance: assert that *forbidden vocabulary* (the
//    NFR-13 list — role names, scope names, factor types, identity
//    probes) is absent from each banner kind's rendered BODY (not
//    the whole container, which contains the home link URL).

import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AuthBanner, type AuthBannerKind } from "../auth-banner.js";
import { selectBannerKind } from "../select-banner-kind.js";

const ALL_KINDS: ReadonlyArray<AuthBannerKind> = [
  "forbidden",
  "mfa_required",
  "session_expired",
  "form_invalid",
  "generic_failure",
];

// Words/phrases the rendered banner copy MUST NOT contain. Each
// would help an attacker enumerate accounts, scopes, roles, MFA
// factor types, or session state. Match is case-insensitive
// substring.
const FORBIDDEN_VOCABULARY: ReadonlyArray<string> = [
  // Privilege / scope names.
  "operator",
  "admin",
  "scope",
  "role",
  // MFA factor types.
  "TOTP",
  "passkey",
  "webauthn",
  "security key",
  "SMS",
  "factor",
  "recovery code",
  "backup code",
  // Identity / state probes.
  "account exists",
  "no such user",
  "wrong password",
  "incorrect password",
  "user not found",
  "not registered",
  "invalid token",
  "expired token",
  "locked",
  "suspended",
  "disabled",
];

function bannerBodyText(container: HTMLElement): string {
  // Heading + paragraph + button text; deliberately excludes the
  // home-link href which legitimately contains the route segment
  // name ("operator") and would otherwise trip the vocabulary list.
  const section = container.querySelector("section");
  const heading = section?.querySelector("h1, h2, h3")?.textContent ?? "";
  const body = section?.querySelector("p")?.textContent ?? "";
  const button = section?.querySelector("button")?.textContent ?? "";
  return [heading, body, button].join(" ").toLowerCase();
}

describe("<AuthBanner />", () => {
  it.each(ALL_KINDS)("renders kind=%s with a heading", (kind) => {
    render(<AuthBanner kind={kind} homeHref={null} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it.each(ALL_KINDS)("kind=%s body excludes enumeration vocabulary (NFR-13)", (kind) => {
    const { container } = render(<AuthBanner kind={kind} homeHref={null} />);
    const text = bannerBodyText(container);
    for (const word of FORBIDDEN_VOCABULARY) {
      expect(text).not.toContain(word.toLowerCase());
    }
  });

  it("form_invalid uses role=status (polite, non-interrupting)", () => {
    render(<AuthBanner kind="form_invalid" homeHref={null} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["forbidden", "mfa_required", "session_expired", "generic_failure"] as const)(
    "kind=%s uses role=alert (assertive)",
    (kind) => {
      render(<AuthBanner kind={kind} homeHref={null} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    },
  );

  it("headingLevel=1 renders h1; default renders h2", () => {
    const { rerender } = render(<AuthBanner kind="forbidden" homeHref={null} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<AuthBanner kind="forbidden" headingLevel={1} homeHref={null} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the reset button when onReset is provided and invokes it", () => {
    const onReset = jest.fn();
    render(<AuthBanner kind="forbidden" onReset={onReset} homeHref={null} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("omits the reset button when onReset is undefined", () => {
    render(<AuthBanner kind="forbidden" homeHref={null} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the home link by default", () => {
    render(<AuthBanner kind="generic_failure" />);
    const link = screen.getByRole("link", { name: /return to console/i });
    expect(link).toHaveAttribute("href", "/operator/console/credentials");
  });

  it("omits the home link when homeHref={null}", () => {
    render(<AuthBanner kind="generic_failure" homeHref={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("selectBannerKind", () => {
  function err(name: string): Error {
    const e = new Error("any message — must not influence banner kind");
    e.name = name;
    return e;
  }

  it("maps role / scope / disabled errors → forbidden", () => {
    expect(selectBannerKind(err("RoleRequiredError"))).toBe("forbidden");
    expect(selectBannerKind(err("ScopeRequiredError"))).toBe("forbidden");
    expect(selectBannerKind(err("PrincipalDisabledError"))).toBe("forbidden");
    expect(selectBannerKind(err("VercelOidcAtInAppSurfaceError"))).toBe("forbidden");
  });

  it("maps form-invalid + recoverable conflicts → form_invalid", () => {
    expect(selectBannerKind(err("RevokeFormInvalidError"))).toBe("form_invalid");
    expect(selectBannerKind(err("SignOutFormInvalidError"))).toBe("form_invalid");
    expect(selectBannerKind(err("IssueFormInvalidError"))).toBe("form_invalid");
    expect(selectBannerKind(err("IssuanceConflictError"))).toBe("form_invalid");
    expect(selectBannerKind(err("ServiceIssuanceConflictError"))).toBe("form_invalid");
    expect(selectBannerKind(err("ApprovalNotFoundError"))).toBe("form_invalid");
    expect(selectBannerKind(err("ApprovalAlreadyExecutedError"))).toBe("form_invalid");
    expect(selectBannerKind(err("SelfApprovalError"))).toBe("form_invalid");
    expect(selectBannerKind(err("TargetNotFoundError"))).toBe("form_invalid");
    expect(selectBannerKind(err("TargetNotHumanError"))).toBe("form_invalid");
    expect(selectBannerKind(err("InvalidCursorError"))).toBe("form_invalid");
  });

  it("maps anonymous / missing-principal → session_expired", () => {
    expect(selectBannerKind(err("AnonymousAccessError"))).toBe("session_expired");
    expect(selectBannerKind(err("PrincipalRequiredError"))).toBe("session_expired");
  });

  it("maps MfaRequiredError → mfa_required (placeholder for future surface)", () => {
    expect(selectBannerKind(err("MfaRequiredError"))).toBe("mfa_required");
  });

  it("maps unknown errors → generic_failure (defaulted, no leakage)", () => {
    expect(selectBannerKind(err("ECONNREFUSED"))).toBe("generic_failure");
    expect(selectBannerKind(err("TypeError"))).toBe("generic_failure");
    expect(selectBannerKind(err(""))).toBe("generic_failure");
  });
});
