// F02 T058 — Pure view for the revoke confirmation page.
//
// Two-stage submission. The page is reached by GET; the operator
// reviews the live credentials that will be revoked, picks a
// reason and (optionally) leaves notes, then submits a form whose
// `confirm=yes` hidden field gates the orchestrator call. A bare
// GET cannot revoke; an accidental form rerender without
// confirm=yes also cannot.
//
// The list of credentials below the form is informational —
// the orchestrator re-queries by principal_id and revokes whatever
// is live at the moment of the call (race-safe).
//
// Accessibility: caption + scope=col on the credentials table,
// fieldset+legend for the reason group, a clear "Cancel" link
// back to the list.

import Link from "next/link";
import type { JSX } from "react";

import type { AgentCredentialListRow } from "@spyglass/auth";

import { REASON_CODES } from "./parse-revoke-input.js";

export interface RevokeConfirmationViewProps {
  readonly principalId: string;
  readonly liveCredentials: ReadonlyArray<AgentCredentialListRow>;
  readonly action: (formData: FormData) => Promise<void> | void;
  readonly cancelHref: string;
}

export function RevokeConfirmationView({
  principalId,
  liveCredentials,
  action,
  cancelHref,
}: RevokeConfirmationViewProps): JSX.Element {
  return (
    <section aria-labelledby="revoke-heading">
      <h1 id="revoke-heading">Revoke agent credentials</h1>
      <p>
        This will revoke <strong>all live credentials</strong> for principal{" "}
        <code>{principalId}</code>. Verifiers will reject the credentials within ~60 seconds.
      </p>

      {liveCredentials.length === 0 ? (
        <p role="status">No live credentials for this principal — there is nothing to revoke.</p>
      ) : (
        <table aria-describedby="revoke-table-caption">
          <caption id="revoke-table-caption">
            Live credentials that will be revoked ({liveCredentials.length}).
          </caption>
          <thead>
            <tr>
              <th scope="col">Credential</th>
              <th scope="col">Issued</th>
              <th scope="col">Expires</th>
              <th scope="col">Scopes</th>
            </tr>
          </thead>
          <tbody>
            {liveCredentials.map((c) => (
              <tr key={c.credential_id}>
                <td>
                  <code>{c.credential_id.slice(0, 8)}…</code>
                </td>
                <td>
                  <time dateTime={c.issued_at.toISOString()}>{c.issued_at.toISOString()}</time>
                </td>
                <td>
                  <time dateTime={c.expires_at.toISOString()}>{c.expires_at.toISOString()}</time>
                </td>
                <td>{c.scope_set.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form action={action} aria-labelledby="revoke-heading">
        <input type="hidden" name="principal_id" value={principalId} />
        <input type="hidden" name="confirm" value="yes" />

        <fieldset>
          <legend>Reason</legend>
          {REASON_CODES.map((code) => (
            <label key={code}>
              {/* No defaultChecked — pre-selecting a destructive reason
                  biases operators under time pressure. `required`
                  enforces deliberate selection. */}
              <input type="radio" name="reason_code" value={code} required />
              {code}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="revoke-notes">Notes (optional, ≤500 chars)</label>
          <textarea id="revoke-notes" name="notes" maxLength={500} rows={3} />
        </div>

        <button
          type="submit"
          disabled={liveCredentials.length === 0}
          aria-disabled={liveCredentials.length === 0 ? true : undefined}
        >
          Revoke credentials
        </button>
        <Link href={cancelHref}>Cancel</Link>
      </form>
    </section>
  );
}
