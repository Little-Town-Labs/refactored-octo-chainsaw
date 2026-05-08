// F02 B2 — Provisional AuditEventSink.
//
// Emits structured JSON to stdout until the F05 `audit_events_buffer`
// pipeline lands. The format is deliberately stable so the upcoming
// buffer-table writer can ingest the same payload without re-shaping.
//
// Per NFR-7 (least privilege at trust boundaries), Clerk userIds in
// `payload.external_id` are hashed before logging — Vercel/observability
// logs receive a stable correlation key but not the IdP identifier.
// The buffer-table sink (F05) writes the raw value to a controlled
// store and is exempt from this redaction.

import { createHash } from "node:crypto";

import type { AuditEventSink } from "@spyglass/auth";

function redactPayload(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  if (typeof out.external_id === "string") {
    out.external_id_hash = createHash("sha256").update(out.external_id).digest("hex").slice(0, 16);
    delete out.external_id;
  }
  return out;
}

export function createConsoleAuditSink(): AuditEventSink {
  return {
    async emit(event) {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        kind: "audit",
        name: event.name,
        principal_id: event.principal_id,
        correlation_id: event.correlation_id,
        payload: redactPayload(event.payload),
      });
      console.info(line);
    },
  };
}
