// F02 T059 — Query-shape lock for the Drizzle audit-events reader.
// Mirrors the `agent-credential-list-repo` test fixture: drizzle's
// pg-proxy driver captures the rendered SQL and parameters without
// opening a connection so we can lock WHERE/ORDER/LIMIT shape.

import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "@spyglass/db";
import type { Db } from "@spyglass/db";

import { createDrizzleAuditEventsListRepo } from "../audit-events-list-repo";

interface CapturedQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

function makeFakeDb() {
  const captured: CapturedQuery[] = [];
  const db = drizzle(
    async (sql, params) => {
      captured.push({ sql, params });
      return { rows: [] };
    },
    { schema },
  ) as unknown as Db;
  return { db, captured };
}

describe("createDrizzleAuditEventsListRepo (query-shape lock)", () => {
  it("with no filters issues a single SELECT with no WHERE clause", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAuditEventsListRepo(db);
    await repo.list({ limit: 50 });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.sql).not.toMatch(/where/i);
  });

  it("principal_id filter is parameterized, not interpolated", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAuditEventsListRepo(db);
    const pid = "11111111-1111-1111-1111-111111111111";
    await repo.list({ principal_id: pid, limit: 50 });
    expect(captured[0]!.params).toContain(pid);
    expect(captured[0]!.sql).not.toContain(pid);
    expect(captured[0]!.sql).toMatch(/"principal_id" =/i);
  });

  it("cursor predicate uses the keyset OR shape: (ts < c) OR (ts = c AND eid < c)", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAuditEventsListRepo(db);
    await repo.list({
      limit: 50,
      cursor_created_at: new Date("2026-05-01T00:00:00Z"),
      cursor_event_id: "00000000-0000-0000-0000-00000000abcd",
    });

    const sql = captured[0]!.sql;
    expect(sql).toMatch(
      /\("audit_events_buffer"\."created_at" <[^)]+or \("audit_events_buffer"\."created_at" =[^)]+and "audit_events_buffer"\."event_id" </is,
    );
  });

  it("orders by created_at DESC then event_id DESC and applies LIMIT", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAuditEventsListRepo(db);
    await repo.list({ limit: 51 });
    expect(captured[0]!.sql).toMatch(
      /order by "audit_events_buffer"\."created_at" desc, "audit_events_buffer"\."event_id" desc limit \$\d+/i,
    );
    expect(captured[0]!.params).toContain(51);
  });
});
