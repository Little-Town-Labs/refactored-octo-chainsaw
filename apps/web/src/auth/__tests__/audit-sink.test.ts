// F02 T069 — Coverage for `redactPayload` in createConsoleAuditSink.
//
// The console sink lands events in Vercel observability (wider
// audience than the audit table). NFR-6 and the T068 security
// review require external_id to be hashed and operator-supplied
// `notes` to be replaced with a `notes_present` boolean before
// the line is logged.

import { createConsoleAuditSink } from "../audit-sink";

function capture(): {
  readonly sink: ReturnType<typeof createConsoleAuditSink>;
  readonly lines: string[];
  restore: () => void;
} {
  const lines: string[] = [];
  const original = console.info;
  console.info = (line: unknown) => {
    lines.push(String(line));
  };
  return {
    sink: createConsoleAuditSink(),
    lines,
    restore: () => {
      console.info = original;
    },
  };
}

describe("createConsoleAuditSink + redactPayload", () => {
  it("hashes external_id and drops the raw value", async () => {
    const c = capture();
    try {
      await c.sink.emit({
        name: "principal.materialized",
        principal_id: "p1",
        correlation_id: "corr-1",
        payload: { external_id: "user_secret_abc" },
      });
      expect(c.lines).toHaveLength(1);
      const parsed = JSON.parse(c.lines[0]!) as {
        payload: Record<string, unknown>;
      };
      expect(parsed.payload).not.toHaveProperty("external_id");
      expect(typeof parsed.payload.external_id_hash).toBe("string");
      expect((parsed.payload.external_id_hash as string).length).toBe(16);
    } finally {
      c.restore();
    }
  });

  it("replaces a non-empty `notes` field with notes_present: true (T068/MEDIUM-3)", async () => {
    const c = capture();
    try {
      await c.sink.emit({
        name: "human_sessions.revoked_all",
        principal_id: "p1",
        correlation_id: "corr-2",
        payload: {
          target_principal_id: "p2",
          notes: "operator A reported suspected token leak at 14:03",
        },
      });
      const parsed = JSON.parse(c.lines[0]!) as { payload: Record<string, unknown> };
      expect(parsed.payload).not.toHaveProperty("notes");
      expect(parsed.payload.notes_present).toBe(true);
      // Sanity: the raw note text must not appear anywhere in the
      // serialized line (no leakage via stringify of a nested field).
      expect(c.lines[0]).not.toContain("token leak");
    } finally {
      c.restore();
    }
  });

  it("replaces an empty/missing `notes` field with notes_present: false", async () => {
    const c = capture();
    try {
      await c.sink.emit({
        name: "human_sessions.revoke_all_initiated",
        principal_id: "p1",
        correlation_id: "corr-3",
        payload: { target_principal_id: "p2", notes: "" },
      });
      const parsed = JSON.parse(c.lines[0]!) as { payload: Record<string, unknown> };
      expect(parsed.payload.notes_present).toBe(false);
    } finally {
      c.restore();
    }
  });

  it("redacts any *_notes suffix field too", async () => {
    const c = capture();
    try {
      await c.sink.emit({
        name: "agent_credential.revoked",
        principal_id: "p1",
        correlation_id: "corr-4",
        payload: { operator_notes: "private context that mentions a person" },
      });
      const parsed = JSON.parse(c.lines[0]!) as { payload: Record<string, unknown> };
      expect(parsed.payload).not.toHaveProperty("operator_notes");
      expect(parsed.payload.operator_notes_present).toBe(true);
      expect(c.lines[0]).not.toContain("private context");
    } finally {
      c.restore();
    }
  });

  it("leaves non-sensitive payload keys intact", async () => {
    const c = capture();
    try {
      await c.sink.emit({
        name: "agent_credential.issued",
        principal_id: "p1",
        correlation_id: "corr-5",
        payload: {
          credential_id: "cred_abc",
          scope_set: ["dossier.read"],
          ttl_seconds: 1800,
        },
      });
      const parsed = JSON.parse(c.lines[0]!) as { payload: Record<string, unknown> };
      expect(parsed.payload.credential_id).toBe("cred_abc");
      expect(parsed.payload.scope_set).toEqual(["dossier.read"]);
      expect(parsed.payload.ttl_seconds).toBe(1800);
    } finally {
      c.restore();
    }
  });
});
