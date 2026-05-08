// F02 B2 — Provisional AuditEventSink.
//
// Emits structured JSON to stderr until the F05 `audit_events_buffer`
// pipeline lands. The format is deliberately stable so the upcoming
// buffer-table writer can ingest the same payload without re-shaping.
//
// Constitution §I.5.3 (accountability) requires every materialization
// to emit an audit event; this sink is the minimum compliant
// implementation pre-F05.

import type { AuditEventSink } from "@spyglass/auth";

export function createConsoleAuditSink(): AuditEventSink {
  return {
    async emit(event) {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        kind: "audit",
        ...event,
      });
      console.info(line);
    },
  };
}
