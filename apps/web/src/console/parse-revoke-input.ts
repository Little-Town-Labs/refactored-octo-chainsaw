// F02 T058 — Pure FormData parser for the revoke form.
//
// Validates the operator's revoke submission: target principal
// (UUID), reason code (enum from RevocationReasonCode), and
// optional notes (length-capped). The orchestrator sanitizes notes
// (strip control chars, trim, cap at 500) so we accept anything
// here and let it own the canonical form.

import type { RevocationReasonCode } from "@spyglass/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTES_MAX_LENGTH = 500;

export const REASON_CODES: ReadonlyArray<RevocationReasonCode> = [
  "run_cancelled",
  "compromise_suspected",
  "operator_emergency",
  "scope_violation_detected",
];

export type RevokeFormField = "principal_id" | "reason_code" | "notes" | "confirm";

export interface ValidRevokeInput {
  readonly principal_id: string;
  readonly reason_code: RevocationReasonCode;
  readonly notes?: string;
}

export type ParseRevokeInputResult =
  | { readonly ok: true; readonly value: ValidRevokeInput }
  | { readonly ok: false; readonly errors: Readonly<Record<RevokeFormField, string | undefined>> };

function isReasonCode(v: string): v is RevocationReasonCode {
  return (REASON_CODES as ReadonlyArray<string>).includes(v);
}

export function parseRevokeInput(form: FormData): ParseRevokeInputResult {
  const errors: Record<RevokeFormField, string | undefined> = {
    principal_id: undefined,
    reason_code: undefined,
    notes: undefined,
    confirm: undefined,
  };

  // Lowercase before returning — UUID is case-insensitive at parse,
  // but downstream audit + DB stay canonical.
  const principal_id = (form.get("principal_id") ?? "").toString().trim().toLowerCase();
  if (!UUID_RE.test(principal_id)) errors.principal_id = "Must be a UUID.";

  const reasonRaw = (form.get("reason_code") ?? "").toString().trim();
  const reason_code: RevocationReasonCode | undefined = isReasonCode(reasonRaw)
    ? reasonRaw
    : undefined;
  if (!reason_code) errors.reason_code = "Choose a reason.";

  const notesRaw = (form.get("notes") ?? "").toString();
  const notes = notesRaw.length > 0 ? notesRaw : undefined;
  if (notes !== undefined && notes.length > NOTES_MAX_LENGTH) {
    errors.notes = `Notes must be ≤${NOTES_MAX_LENGTH} characters.`;
  }

  // Two-step confirmation: the form has a hidden `confirm` field set
  // to "yes" only when the operator submitted the second-stage form.
  // A bare GET / form-rerender / accidental click never reaches the
  // orchestrator without it.
  const confirm = (form.get("confirm") ?? "").toString();
  if (confirm !== "yes") errors.confirm = "Confirmation required.";

  const hasErrors = Object.values(errors).some((v) => v !== undefined);
  if (hasErrors || !reason_code) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      principal_id,
      reason_code,
      ...(notes !== undefined ? { notes } : {}),
    },
  };
}
