// F02 T060 — Pure view for the sign-out confirmation page (FR-35, EC-3).
//
// Two flows share this view:
//
//   - Non-operator target (seeker, employer_*): single-step. Operator
//     picks a reason, submits, all sessions revoke immediately.
//   - Operator target: two-step. First operator submits, gets a
//     pending approval link (rendered separately by the page when
//     `pendingApprovalId` is present). Second operator opens the
//     link, sees the same form pre-populated with `approval_id`, and
//     submits to execute.
//
// The view never decides which flow applies — the caller passes
// `targetTier` and the optional `pendingApprovalId`. Copy adapts
// accordingly so an operator under time pressure understands what
// will happen on submit.
//
// Accessibility: section is labeled by the heading, fieldset+legend
// for the reason group, role=status for the pending banner, clear
// Cancel link, `aria-disabled` on submit when confirmation cannot
// proceed.

import Link from "next/link";
import type { JSX } from "react";

import { SIGN_OUT_REASON_CODES } from "./parse-sign-out-input";

export interface SignOutConfirmationViewProps {
  readonly targetPrincipalId: string;
  /** Used for copy adaptation only. */
  readonly targetTier: "seeker" | "employer_admin" | "employer_member" | "operator";
  /**
   * When the URL carries an approval_id (second-operator path), it is
   * passed in so the form pre-populates it as a hidden field. The
   * second operator MUST be a different human than the initiator;
   * the orchestrator enforces this and the audit denial captures it.
   */
  readonly approvalIdFromUrl?: string;
  /**
   * Truthy when this view renders the "pending approval" success
   * state — i.e. the first operator just submitted against an operator
   * target. The page passes the approval_id so the operator can share
   * the link with a second operator.
   */
  readonly pendingApprovalId?: string;
  /** Unix seconds — orchestrator-reported expiry of the pending row. */
  readonly pendingExpiresAt?: number;
  /** Path to direct second operator to (pre-filled with approval_id). */
  readonly secondOperatorHrefBase: string;
  readonly action: (formData: FormData) => Promise<void> | void;
  readonly cancelHref: string;
}

export function SignOutConfirmationView({
  targetPrincipalId,
  targetTier,
  approvalIdFromUrl,
  pendingApprovalId,
  pendingExpiresAt,
  secondOperatorHrefBase,
  action,
  cancelHref,
}: SignOutConfirmationViewProps): JSX.Element {
  const targetIsOperator = targetTier === "operator";

  // Pending-approval state rendered ABOVE the form so the operator
  // sees confirmation of the first step before the second-step form.
  if (pendingApprovalId !== undefined) {
    const params = new URLSearchParams({ approval_id: pendingApprovalId });
    const secondOperatorHref = `${secondOperatorHrefBase}?${params.toString()}`;
    return (
      <section aria-labelledby="sign-out-pending-heading">
        <h1 id="sign-out-pending-heading">Sign-out pending second-operator approval</h1>
        <p role="status">
          Your sign-out request for operator <code>{targetPrincipalId}</code> has been recorded. A
          second operator must approve before sessions revoke.
        </p>
        <dl>
          <dt>Approval ID</dt>
          <dd>
            <code>{pendingApprovalId}</code>
          </dd>
          {pendingExpiresAt !== undefined ? (
            <>
              <dt>Expires</dt>
              <dd>
                <time dateTime={new Date(pendingExpiresAt * 1000).toISOString()}>
                  {new Date(pendingExpiresAt * 1000).toISOString()}
                </time>
              </dd>
            </>
          ) : null}
        </dl>
        <p>
          Send this link to a second operator (it cannot be you — the orchestrator rejects
          self-approval):
        </p>
        <p>
          <code>{secondOperatorHref}</code>
        </p>
        <Link href={cancelHref}>Return to credentials</Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="sign-out-heading">
      <h1 id="sign-out-heading">
        {targetIsOperator
          ? approvalIdFromUrl !== undefined
            ? "Approve sign-out (second operator)"
            : "Initiate sign-out (operator target)"
          : "Sign out all sessions"}
      </h1>
      <p>
        This will revoke <strong>all active sessions</strong> for principal{" "}
        <code>{targetPrincipalId}</code> at the identity provider. Verifiers will see the revocation
        within ~60 seconds.
      </p>

      {targetIsOperator ? (
        approvalIdFromUrl !== undefined ? (
          <p role="status">
            You are the <strong>second operator</strong>. Submitting will execute the sign-out
            immediately. The orchestrator will reject this approval if you initiated it.
          </p>
        ) : (
          <p role="status">
            The target is an operator. Submitting opens a pending approval — a second operator must
            approve within 15 minutes before sessions revoke.
          </p>
        )
      ) : null}

      <form action={action} aria-labelledby="sign-out-heading">
        <input type="hidden" name="target_principal_id" value={targetPrincipalId} />
        <input type="hidden" name="confirm" value="yes" />
        {approvalIdFromUrl !== undefined ? (
          <input type="hidden" name="approval_id" value={approvalIdFromUrl} />
        ) : null}

        <fieldset>
          <legend>Reason</legend>
          {SIGN_OUT_REASON_CODES.map((code) => (
            <label key={code}>
              <input type="radio" name="reason_code" value={code} required />
              {code}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="sign-out-notes">Notes (optional, ≤500 chars)</label>
          <textarea id="sign-out-notes" name="notes" maxLength={500} rows={3} />
        </div>

        <button type="submit">
          {targetIsOperator
            ? approvalIdFromUrl !== undefined
              ? "Approve and sign out"
              : "Initiate sign-out"
            : "Sign out all sessions"}
        </button>
        <Link href={cancelHref}>Cancel</Link>
      </form>
    </section>
  );
}
