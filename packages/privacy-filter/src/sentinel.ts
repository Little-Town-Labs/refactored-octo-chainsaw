import type { PrivacyRepository } from "./repo.js";
import type { PrivacyInputClass, PrivacyReasonCode, UntrustedInputEnvelope } from "./types.js";
import { contentHash } from "./validation.js";

export function openingSentinel(
  runId: string,
  nonce: string,
  inputClass: PrivacyInputClass,
): string {
  return `<<SPYGLASS_UNTRUSTED:${runId}:${nonce}:${inputClass}:BEGIN>>`;
}

export function closingSentinel(
  runId: string,
  nonce: string,
  inputClass: PrivacyInputClass,
): string {
  return `<<SPYGLASS_UNTRUSTED:${runId}:${nonce}:${inputClass}:END>>`;
}

export function wrapUntrustedText(input: {
  readonly run_id: string;
  readonly nonce: string;
  readonly input_class: PrivacyInputClass;
  readonly source_ref: string;
  readonly text: string;
}): UntrustedInputEnvelope {
  const open = openingSentinel(input.run_id, input.nonce, input.input_class);
  const close = closingSentinel(input.run_id, input.nonce, input.input_class);
  if (input.text.includes(close)) {
    throw new Error("sentinel_injection_detected");
  }
  return {
    run_id: input.run_id,
    nonce: input.nonce,
    input_class: input.input_class,
    source_ref: input.source_ref,
    wrapped_text: `${open}\n${input.text}\n${close}`,
    content_hash: contentHash(input.text),
  };
}

export function validateUntrustedEnvelope(
  envelope: UntrustedInputEnvelope,
): { ok: true; text: string } | { ok: false; reason_code: PrivacyReasonCode } {
  const open = openingSentinel(envelope.run_id, envelope.nonce, envelope.input_class);
  const close = closingSentinel(envelope.run_id, envelope.nonce, envelope.input_class);
  const openCount = count(envelope.wrapped_text, open);
  const closeCount = count(envelope.wrapped_text, close);
  if (openCount === 0 || closeCount === 0) return { ok: false, reason_code: "sentinel_missing" };
  if (openCount > 1 || closeCount > 1) return { ok: false, reason_code: "sentinel_duplicate" };
  if (
    !envelope.wrapped_text.startsWith(`${open}\n`) ||
    !envelope.wrapped_text.endsWith(`\n${close}`)
  ) {
    return { ok: false, reason_code: "sentinel_mismatch" };
  }
  const text = envelope.wrapped_text.slice(open.length + 1, -close.length - 1);
  if (text.includes(close)) return { ok: false, reason_code: "sentinel_injection_detected" };
  return { ok: true, text };
}

export async function recordSentinelFailure(input: {
  readonly repository: PrivacyRepository;
  readonly envelope: UntrustedInputEnvelope;
  readonly reason_code: PrivacyReasonCode;
  readonly audit_event_id?: string | null;
}) {
  return input.repository.appendSentinelFailure({
    run_id: input.envelope.run_id,
    input_class: input.envelope.input_class,
    reason_code: input.reason_code,
    source_content_hash: input.envelope.content_hash,
    audit_event_id: input.audit_event_id ?? null,
  });
}

function count(text: string, search: string): number {
  return text.split(search).length - 1;
}
