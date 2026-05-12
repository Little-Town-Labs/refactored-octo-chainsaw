// F02 T056 — Query-shape lock for the Drizzle `AgentCredentialListRepo`
// adapter. Drizzle's pg driver is mocked via a fake that captures the
// rendered SQL and parameters without ever opening a connection.
//
// We're not unit-testing the database — that's the integration
// harness's job. We're locking the WHERE/ORDER/LIMIT shape so a
// silent regression in keyset pagination (off-by-one, OR/AND
// inversion, accidentally dropped predicate) trips this test before
// it reaches a Neon branch.

import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "@spyglass/db";
import type { Db } from "@spyglass/db";

import { createDrizzleAgentCredentialListRepo } from "../agent-credential-list-repo";

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

describe("createDrizzleAgentCredentialListRepo (query-shape lock)", () => {
  it("status='active' adds revoked_at IS NULL + expires_at > now predicates", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAgentCredentialListRepo(db);
    const now = new Date("2026-05-09T00:00:00Z");
    await repo.list({ status: "active", limit: 50, now });

    expect(captured).toHaveLength(1);
    expect(captured[0]!.sql).toMatch(/"revoked_at" is null/i);
    expect(captured[0]!.sql).toMatch(/"expires_at" >/i);
    expect(captured[0]!.params).toContain(now.toISOString());
  });

  it("status='revoked' filters revoked_at IS NOT NULL", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAgentCredentialListRepo(db);
    await repo.list({ status: "revoked", limit: 50, now: new Date() });
    expect(captured[0]!.sql).toMatch(/"revoked_at" is not null/i);
  });

  it("status='all' with no filters issues a single SELECT with no WHERE clause", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAgentCredentialListRepo(db);
    await repo.list({ status: "all", limit: 50, now: new Date() });
    expect(captured[0]!.sql).not.toMatch(/where/i);
  });

  it("cursor predicate uses the keyset OR shape: (iat < c) OR (iat = c AND cid < c)", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAgentCredentialListRepo(db);
    await repo.list({
      status: "all",
      limit: 50,
      now: new Date(),
      cursor_issued_at: new Date("2026-05-01T00:00:00Z"),
      cursor_credential_id: "00000000-0000-0000-0000-00000000abcd",
    });

    const sql = captured[0]!.sql;
    expect(sql).toMatch(
      /\("agent_credentials"\."issued_at" <[^)]+or \("agent_credentials"\."issued_at" =[^)]+and "agent_credentials"\."credential_id" </is,
    );
  });

  it("orders by issued_at DESC then credential_id DESC and applies LIMIT", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAgentCredentialListRepo(db);
    await repo.list({ status: "all", limit: 51, now: new Date() });
    expect(captured[0]!.sql).toMatch(
      /order by "agent_credentials"\."issued_at" desc, "agent_credentials"\."credential_id" desc limit \$\d+/i,
    );
    expect(captured[0]!.params).toContain(51);
  });

  it("principal_id filter is parameterized, not interpolated", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleAgentCredentialListRepo(db);
    const pid = "11111111-1111-1111-1111-111111111111";
    await repo.list({ status: "all", principal_id: pid, limit: 50, now: new Date() });
    expect(captured[0]!.params).toContain(pid);
    expect(captured[0]!.sql).not.toContain(pid);
  });
});
