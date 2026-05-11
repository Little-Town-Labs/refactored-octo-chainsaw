// F02 T060 — Pure FormData parser for the sign-out confirmation form.
//
// The sign-out flow has two shapes; the form is unified and the
// orchestrator branches on whether `approval_id` is present:
//
//   - First call (any target): operator picks reason + optional notes
//     and submits without `approval_id`. The orchestrator returns
//     `executed` for non-operator targets, or `pending_approval` for
//     operator targets (handing back an `approval_id`).
//   - Second call (operator target only): the second operator submits
//     the same form with `approval_id` populated from the link the
//     first operator shared.
//
// The orchestrator sanitizes `notes` (strip control chars, trim, cap
// at 500) so we accept anything here.

import type { RevokeAllReasonCode } from "@spyglass/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTES_MAX_LENGTH = 500;

export const SIGN_OUT_REASON_CODES: ReadonlyArray<RevokeAllReasonCode> = [
  "session_compromise",
  "operator_emergency",
  "credential_rotation",
  "compliance_action",
];

export type SignOutFormField =
  | "target_principal_id"
  | "reason_code"
  | "notes"
  | "approval_id"
  | "confirm";

export interface ValidSignOutInput {
  readonly target_principal_id: string;
  readonly reason_code: RevokeAllReasonCode;
  readonly notes?: string;
  readonly approval_id?: string;
}

export type ParseSignOutInputResult =
  | { readonly ok: true; readonly value: ValidSignOutInput }
  | {
      readonly ok: false;
      readonly errors: Readonly<Record<SignOutFormField, string | undefined>>;
    };

function isReasonCode(v: string): v is RevokeAllReasonCode {
  return (SIGN_OUT_REASON_CODES as ReadonlyArray<string>).includes(v);
}

export function parseSignOutInput(form: FormData): ParseSignOutInputResult {
  const errors: Record<SignOutFormField, string | undefined> = {
    target_principal_id: undefined,
    reason_code: undefined,
    notes: undefined,
    approval_id: undefined,
    confirm: undefined,
  };

  const target_principal_id = (form.get("target_principal_id") ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (!UUID_RE.test(target_principal_id)) {
    errors.target_principal_id = "Must be a UUID.";
  }

  const reasonRaw = (form.get("reason_code") ?? "").toString().trim();
  const reason_code: RevokeAllReasonCode | undefined = isReasonCode(reasonRaw)
    ? reasonRaw
    : undefined;
  if (!reason_code) errors.reason_code = "Choose a reason.";

  const notesRaw = (form.get("notes") ?? "").toString();
  const notes = notesRaw.length > 0 ? notesRaw : undefined;
  if (notes !== undefined && notes.length > NOTES_MAX_LENGTH) {
    errors.notes = `Notes must be ≤${NOTES_MAX_LENGTH} characters.`;
  }

  // Empty string from the form means "not provided"; only validate
  // shape when the operator actually pasted something.
  const approvalRaw = (form.get("approval_id") ?? "").toString().trim().toLowerCase();
  let approval_id: string | undefined;
  if (approvalRaw.length > 0) {
    if (!UUID_RE.test(approvalRaw)) {
      errors.approval_id = "Must be a UUID.";
    } else {
      approval_id = approvalRaw;
    }
  }

  const confirm = (form.get("confirm") ?? "").toString();
  if (confirm !== "yes") errors.confirm = "Confirmation required.";

  const hasErrors = Object.values(errors).some((v) => v !== undefined);
  if (hasErrors || !reason_code) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      target_principal_id,
      reason_code,
      ...(notes !== undefined ? { notes } : {}),
      ...(approval_id !== undefined ? { approval_id } : {}),
    },
  };
}
