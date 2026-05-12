// F02 T060 — Query-shape lock for the Drizzle revoke-all-sessions
// adapters. Uses drizzle's `pg-proxy` driver to capture rendered SQL
// + parameters without opening a connection. We assert the WHERE /
// returning shape that's contract-relevant (defense-in-depth guards,
// idempotency predicates, target lookup narrowing).
//
// Mirrors the pattern from `agent-credential-list-repo.test.ts` and
// `audit-events-list-repo.test.ts`.

import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "@spyglass/db";
import type { Db } from "@spyglass/db";
import type { ClerkSessionRevoker } from "@spyglass/auth";

import {
  createDrizzlePrincipalKindLookup,
  createDrizzleRevokeAllApprovalRepo,
  createSessionRevokerFromClerkRevoker,
} from "../revoke-all-sessions-repos";

interface CapturedQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

function makeFakeDb(
  responder: (sql: string, params: ReadonlyArray<unknown>) => { rows: unknown[] } = () => ({
    rows: [],
  }),
) {
  const captured: CapturedQuery[] = [];
  const db = drizzle(
    async (sql, params) => {
      captured.push({ sql, params });
      return responder(sql, params);
    },
    { schema },
  ) as unknown as Db;
  return { db, captured };
}

const APPROVAL_ID = "11111111-1111-7111-8111-111111111111";
const INITIATOR = "22222222-2222-7222-8222-222222222222";
const APPROVER = "33333333-3333-7333-8333-333333333333";
const TARGET = "44444444-4444-7444-8444-444444444444";

describe("createDrizzleRevokeAllApprovalRepo (query-shape lock)", () => {
  it("insertApproval issues INSERT … RETURNING approval_id", async () => {
    // pg-proxy returns rows as positional arrays matching the
    // SELECT/RETURNING column order. `.returning({approval_id})` has
    // one column so each row is `[APPROVAL_ID]`.
    const { db, captured } = makeFakeDb(() => ({
      rows: [[APPROVAL_ID]],
    }));
    const repo = createDrizzleRevokeAllApprovalRepo(db);
    const now = new Date("2026-05-10T00:00:00Z");
    const expiresAt = new Date("2026-05-10T00:15:00Z");
    const result = await repo.insertApproval({
      target_principal_id: TARGET,
      initiated_by: INITIATOR,
      reason_code: "session_compromise",
      notes: null,
      initiated_at: now,
      expires_at: expiresAt,
    });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.sql).toMatch(/insert into "revoke_all_sessions_approvals"/i);
    expect(captured[0]!.sql).toMatch(/returning "approval_id"/i);
    expect(result.approval_id).toBe(APPROVAL_ID);
  });

  it("findApproval issues a parameterized SELECT by approval_id with limit 1", async () => {
    const { db, captured } = makeFakeDb();
    const repo = createDrizzleRevokeAllApprovalRepo(db);
    await repo.findApproval(APPROVAL_ID);
    expect(captured).toHaveLength(1);
    expect(captured[0]!.sql).toMatch(/"approval_id" =/i);
    expect(captured[0]!.sql).toMatch(/limit/i);
    expect(captured[0]!.params).toContain(APPROVAL_ID);
    expect(captured[0]!.sql).not.toContain(APPROVAL_ID);
  });

  it("findApproval returns null when no row exists", async () => {
    const { db } = makeFakeDb(() => ({ rows: [] }));
    const repo = createDrizzleRevokeAllApprovalRepo(db);
    const result = await repo.findApproval(APPROVAL_ID);
    expect(result).toBeNull();
  });

  it("markApproved UPDATE guards executed_at IS NULL AND initiated_by <> approved_by", async () => {
    const { db, captured } = makeFakeDb(() => ({
      rows: [[APPROVAL_ID]],
    }));
    const repo = createDrizzleRevokeAllApprovalRepo(db);
    const now = new Date("2026-05-10T00:01:00Z");
    const ok = await repo.markApproved({
      approval_id: APPROVAL_ID,
      approved_by: APPROVER,
      approved_at: now,
      executed_at: now,
    });
    expect(ok).toBe(true);
    expect(captured).toHaveLength(1);
    const sql = captured[0]!.sql;
    expect(sql).toMatch(/update "revoke_all_sessions_approvals"/i);
    // Idempotency guard.
    expect(sql).toMatch(/"executed_at" is null/i);
    // Approved-once immutability guard.
    expect(sql).toMatch(/"approved_by" is null/i);
    // Belt-and-braces self-approval guard, locked to a parameter
    // reference (not a literal or unrelated column) and verified to
    // bind the approver value.
    expect(sql).toMatch(/"initiated_by" <> \$\d+/);
    expect(captured[0]!.params).toContain(APPROVER);
    // Returning so we can detect the lost-race case.
    expect(sql).toMatch(/returning/i);
    expect(captured[0]!.params).toContain(APPROVAL_ID);
  });

  it("markApproved returns false when zero rows are affected (lost race)", async () => {
    const { db } = makeFakeDb(() => ({ rows: [] }));
    const repo = createDrizzleRevokeAllApprovalRepo(db);
    const ok = await repo.markApproved({
      approval_id: APPROVAL_ID,
      approved_by: APPROVER,
      approved_at: new Date(),
      executed_at: new Date(),
    });
    expect(ok).toBe(false);
  });
});

describe("createDrizzlePrincipalKindLookup (query-shape lock)", () => {
  it("issues SELECT kind/tier/external_id by principal_id limit 1", async () => {
    const { db, captured } = makeFakeDb();
    const lookup = createDrizzlePrincipalKindLookup(db);
    await lookup.lookupTarget(TARGET);
    expect(captured).toHaveLength(1);
    const sql = captured[0]!.sql;
    expect(sql).toMatch(/"principal_id" =/i);
    expect(sql).toMatch(/limit/i);
    expect(captured[0]!.params).toContain(TARGET);
  });

  it("returns null for unknown principal", async () => {
    const { db } = makeFakeDb(() => ({ rows: [] }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toBeNull();
  });

  it("returns null when human row is malformed (missing external_id)", async () => {
    // SELECT order: kind, tier, external_id.
    const { db } = makeFakeDb(() => ({
      rows: [["human", "operator", null]],
    }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toBeNull();
  });

  it("returns null when human row is malformed (missing tier)", async () => {
    const { db } = makeFakeDb(() => ({
      rows: [["human", null, "user_abc"]],
    }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toBeNull();
  });

  it("returns human shape with tier + external_id", async () => {
    const { db } = makeFakeDb(() => ({
      rows: [["human", "operator", "user_abc"]],
    }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toEqual({ kind: "human", tier: "operator", external_id: "user_abc" });
  });

  it("returns agent shape with no external_id", async () => {
    const { db } = makeFakeDb(() => ({
      rows: [["agent", null, null]],
    }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toEqual({ kind: "agent" });
  });

  it("returns service shape", async () => {
    const { db } = makeFakeDb(() => ({
      rows: [["service", null, null]],
    }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toEqual({ kind: "service" });
  });

  it("returns null for unknown kind value (defense-in-depth)", async () => {
    const { db } = makeFakeDb(() => ({
      rows: [["alien", null, null]],
    }));
    const lookup = createDrizzlePrincipalKindLookup(db);
    const result = await lookup.lookupTarget(TARGET);
    expect(result).toBeNull();
  });
});

describe("createSessionRevokerFromClerkRevoker", () => {
  it("delegates revokeAllSessionsForExternalId to inner revokeAllSessionsForUser with reason", async () => {
    const calls: Array<{ external_id: string; reason: string }> = [];
    const inner: ClerkSessionRevoker = {
      async revokeAllSessionsForUser(input) {
        calls.push({ external_id: input.external_id, reason: input.reason });
      },
    };
    const wrapped = createSessionRevokerFromClerkRevoker(inner);
    await wrapped.revokeAllSessionsForExternalId({
      external_id: "user_abc",
      reason: "session_compromise",
    });
    expect(calls).toEqual([{ external_id: "user_abc", reason: "session_compromise" }]);
  });
});
