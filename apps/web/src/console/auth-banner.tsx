// F02 T061 — Auth-failure / MFA-step banner (NFR-12, NFR-13, NFR-14).
//
// One pure component, five discriminated kinds. Each renders fixed
// copy that is deliberately uninformative about *why* the failure
// happened beyond the broad category. NFR-13 forbids surfaces that
// would help an attacker enumerate accounts, scopes, MFA factor
// types, or session state. The kinds map to typed error classes the
// boundary throws, but the copy itself never mentions a specific
// scope/role/factor.
//
// Forbidden vocabulary in the copy (audited by tests):
//   - "operator", "admin", "scope", "role" (specific privilege names)
//   - "TOTP", "passkey", "SMS", "factor" (MFA factor types)
//   - "account exists", "no such user", "wrong password" (identity probes)
//
// Accessibility:
//   - `role="alert"` for hard-deny kinds so screen readers announce
//     the deny without requiring focus; `role="status"` (polite) for
//     `form_invalid` since interrupting the user mid-correction is
//     wrong per WCAG 2.2 (alert is reserved for important, time-
//     sensitive info).
//   - The heading level is configurable: `1` from `error.tsx` which
//     replaces the page; default `2` for inline use under an existing
//     page heading. (WCAG 2.4.6 / 1.3.1 — one h1 per document.)
//   - The reset button (when provided) is the natural next focus
//     target after the announcement. `error.tsx` moves focus to the
//     banner section on mount for keyboard users.

import type { JSX } from "react";

export type AuthBannerKind =
  | "forbidden"
  | "mfa_required"
  | "session_expired"
  | "form_invalid"
  | "generic_failure";

export interface AuthBannerProps {
  readonly kind: AuthBannerKind;
  /**
   * Optional reset handler. When provided, renders a button that
   * invokes it (used by Next's `error.tsx` boundary to re-render the
   * segment). When omitted, the banner is a pure announcement.
   */
  readonly onReset?: () => void;
  /** Defaults to "/operator/console/credentials"; pass `null` to omit. */
  readonly homeHref?: string | null;
  /**
   * Heading level for the banner title. Default `2` (inline use under
   * an existing page heading); `error.tsx` passes `1` because it
   * replaces the entire segment.
   */
  readonly headingLevel?: 1 | 2 | 3;
  /** Optional DOM ref forwarded to the wrapping section (used for focus). */
  readonly sectionRef?: React.Ref<HTMLElement>;
}

interface BannerCopy {
  readonly heading: string;
  readonly body: string;
  readonly resetLabel: string;
}

const COPY: Record<AuthBannerKind, BannerCopy> = {
  forbidden: {
    heading: "Access denied",
    body: "You do not have access to this resource. If you believe this is a mistake, contact your support team.",
    resetLabel: "Try again",
  },
  mfa_required: {
    heading: "Additional verification required",
    body: "Please complete the verification step from your account before continuing. You may need to sign in again.",
    resetLabel: "Retry",
  },
  session_expired: {
    heading: "Session is no longer valid",
    body: "Your session is no longer valid. Sign in to continue.",
    resetLabel: "Retry",
  },
  form_invalid: {
    heading: "Submission could not be processed",
    body: "Some of the values entered were not accepted. Please review the form and resubmit.",
    resetLabel: "Return to form",
  },
  generic_failure: {
    heading: "Something went wrong",
    body: "The console encountered an unexpected error. The operations team has been notified.",
    resetLabel: "Retry",
  },
};

const DEFAULT_HOME_HREF = "/operator/console/credentials";

// `form_invalid` is informational, not interrupting — others are
// hard denies that should announce immediately.
function ariaRoleForKind(kind: AuthBannerKind): "alert" | "status" {
  return kind === "form_invalid" ? "status" : "alert";
}

export function AuthBanner({
  kind,
  onReset,
  homeHref,
  headingLevel = 2,
  sectionRef,
}: AuthBannerProps): JSX.Element {
  const copy = COPY[kind];
  const headingId = `auth-banner-${kind}-heading`;
  const resolvedHome = homeHref === undefined ? DEFAULT_HOME_HREF : homeHref;
  const role = ariaRoleForKind(kind);
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <section ref={sectionRef} role={role} aria-labelledby={headingId} tabIndex={-1}>
      <Heading id={headingId}>{copy.heading}</Heading>
      <p>{copy.body}</p>
      {onReset !== undefined ? (
        <button type="button" onClick={onReset}>
          {copy.resetLabel}
        </button>
      ) : null}
      {resolvedHome !== null ? <a href={resolvedHome}>Return to console</a> : null}
    </section>
  );
}
