"use client";

// F02 T057 — Operator credential issue form (client component).
//
// React 19's `useActionState` wires the server action and exposes
// the `{ ok, errors? | jwt? }` discriminated state. On success the
// form is replaced by `<IssueResultPanel>` which renders the JWT
// exactly ONCE (NFR-6): the value lives only in the action-state
// memory cell, never in form fields or analytics.
//
// Accessibility: each input has a visible <label htmlFor>. Errors
// are linked from the input via `aria-errormessage` (WCAG 4.1.3
// Status Messages). The submit button's `aria-disabled` honors the
// pending state so screen readers announce the in-flight call.
//
// TODO(T062): focus management. On error-state transition, focus
// the first invalid input via useEffect+useRef so the error is
// announced and the operator lands at the field that needs fixing.
// Tracked as part of the WCAG 2.2 AA verification pass.
//
// The form is intentionally minimal — no fancy combobox for scopes
// or contracts. v0 is "operator types known values from the runbook";
// v1 (post-B6) can layer typeahead on top.

import { useActionState, useState } from "react";

import type { IssueFormField } from "./parse-issue-input";

export type IssueResultState =
  | { readonly status: "idle" }
  | {
      readonly status: "error";
      readonly errors: Readonly<Record<IssueFormField, string | undefined>>;
      readonly serverError?: string;
    }
  | {
      readonly status: "success";
      readonly jwt: string;
      readonly credential_id: string;
      readonly expires_at: number;
    };

export type IssueAction = (
  state: IssueResultState,
  formData: FormData,
) => Promise<IssueResultState>;

export interface IssueCredentialFormProps {
  readonly action: IssueAction;
  readonly availableScopes: ReadonlyArray<string>;
  readonly initialState?: IssueResultState;
}

const INITIAL: IssueResultState = { status: "idle" };

function errorFor(state: IssueResultState, field: IssueFormField): string | undefined {
  return state.status === "error" ? state.errors[field] : undefined;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <span id={id} role="alert">
      {message}
    </span>
  );
}

export function IssueCredentialForm({
  action,
  availableScopes,
  initialState = INITIAL,
}: IssueCredentialFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.status === "success") {
    return (
      <IssueResultPanel
        jwt={state.jwt}
        credentialId={state.credential_id}
        expiresAt={state.expires_at}
      />
    );
  }

  return (
    <form action={formAction} aria-labelledby="issue-form-heading">
      <h2 id="issue-form-heading">Issue agent credential</h2>

      {state.status === "error" && state.serverError ? (
        <p role="alert" data-status="server-error">
          {state.serverError}
        </p>
      ) : null}

      <div>
        <label htmlFor="run_id">Run ID</label>
        <input
          id="run_id"
          name="run_id"
          required
          aria-required="true"
          aria-errormessage="run_id-error"
          aria-invalid={errorFor(state, "run_id") ? true : undefined}
        />
        <FieldError id="run_id-error" message={errorFor(state, "run_id")} />
      </div>

      <div>
        <label htmlFor="agent_principal_id">Agent principal ID</label>
        <input
          id="agent_principal_id"
          name="agent_principal_id"
          required
          aria-required="true"
          aria-errormessage="agent_principal_id-error"
          aria-invalid={errorFor(state, "agent_principal_id") ? true : undefined}
        />
        <FieldError id="agent_principal_id-error" message={errorFor(state, "agent_principal_id")} />
      </div>

      <fieldset>
        <legend>Side</legend>
        <label>
          <input type="radio" name="side" value="seeker" required defaultChecked />
          Seeker
        </label>
        <label>
          <input type="radio" name="side" value="employer" />
          Employer
        </label>
        <FieldError id="side-error" message={errorFor(state, "side")} />
      </fieldset>

      <div>
        <label htmlFor="contract_id">Contract ID</label>
        <input
          id="contract_id"
          name="contract_id"
          required
          aria-required="true"
          aria-errormessage="contract_id-error"
          aria-invalid={errorFor(state, "contract_id") ? true : undefined}
        />
        <FieldError id="contract_id-error" message={errorFor(state, "contract_id")} />
      </div>

      <div>
        <label htmlFor="contract_version">Contract version</label>
        <input
          id="contract_version"
          name="contract_version"
          required
          aria-required="true"
          aria-errormessage="contract_version-error"
          aria-invalid={errorFor(state, "contract_version") ? true : undefined}
        />
        <FieldError id="contract_version-error" message={errorFor(state, "contract_version")} />
      </div>

      <div>
        <label htmlFor="ticket_id">Ticket ID</label>
        <input
          id="ticket_id"
          name="ticket_id"
          required
          aria-required="true"
          aria-errormessage="ticket_id-error"
          aria-invalid={errorFor(state, "ticket_id") ? true : undefined}
        />
        <FieldError id="ticket_id-error" message={errorFor(state, "ticket_id")} />
      </div>

      <fieldset>
        <legend>Scopes (FR-19: at least one)</legend>
        {availableScopes.map((s) => (
          <label key={s}>
            <input type="checkbox" name="scope_set" value={s} />
            {s}
          </label>
        ))}
        <FieldError id="scope_set-error" message={errorFor(state, "scope_set")} />
      </fieldset>

      <div>
        <label htmlFor="ttl_minutes">TTL (minutes; max 120)</label>
        <input
          id="ttl_minutes"
          name="ttl_minutes"
          type="number"
          min={1}
          max={120}
          defaultValue={30}
          required
          aria-required="true"
          aria-errormessage="ttl_minutes-error"
          aria-invalid={errorFor(state, "ttl_minutes") ? true : undefined}
        />
        <FieldError id="ttl_minutes-error" message={errorFor(state, "ttl_minutes")} />
      </div>

      <button type="submit" aria-disabled={pending ? true : undefined} disabled={pending}>
        {pending ? "Issuing…" : "Issue credential"}
      </button>
    </form>
  );
}

interface IssueResultPanelProps {
  readonly jwt: string;
  readonly credentialId: string;
  readonly expiresAt: number;
}

function IssueResultPanel({ jwt, credentialId, expiresAt }: IssueResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const expiresIso = new Date(expiresAt * 1000).toISOString();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(jwt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="issue-success-heading" data-status="success">
      <h2 id="issue-success-heading">Credential issued</h2>
      <p role="status">
        <strong>Save this token now — it will not be shown again.</strong> The credential value is
        held in this page only and will be discarded as soon as you navigate away.
      </p>
      <dl>
        <dt>Credential ID</dt>
        <dd>
          <code>{credentialId}</code>
        </dd>
        <dt>Expires</dt>
        <dd>
          <time dateTime={expiresIso}>{expiresIso}</time>
        </dd>
      </dl>
      <label htmlFor="issued-jwt">JWT</label>
      <textarea id="issued-jwt" readOnly value={jwt} aria-describedby="issued-jwt-help" />
      <p id="issued-jwt-help">
        Copy the entire token. It is never written to logs, analytics, or the database.
      </p>
      <button type="button" onClick={onCopy} aria-live="polite">
        {copied ? "Copied" : "Copy to clipboard"}
      </button>
    </section>
  );
}
