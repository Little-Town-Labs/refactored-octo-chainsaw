// F02 T059a — Tests for `createDrizzleAuditSink`.

import type { AuditEventSink } from "@spyglass/auth";
import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "@spyglass/db";
import type { Db } from "@spyglass/db";

import { createDrizzleAuditSink } from "../audit-sink-db.js";

interface CapturedQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

function makeFakeDb(rowsBySql: (sql: string) => unknown[][]) {
  const captured: CapturedQuery[] = [];
  const db = drizzle(
    async (sql, params) => {
      captured.push({ sql, params });
      return { rows: rowsBySql(sql) };
    },
    { schema },
  ) as unknown as Db;
  return { db, captured };
}

function makeFallback() {
  const events: Array<Parameters<AuditEventSink["emit"]>[0]> = [];
  const sink: AuditEventSink = {
    async emit(e) {
      events.push(e);
    },
  };
  return { sink, events };
}

const PID = "00000000-0000-0000-0000-00000000a001";

describe("createDrizzleAuditSink", () => {
  it("inserts into audit_events_buffer with kind + role from principals lookup", async () => {
    const { db, captured } = makeFakeDb((sql) => {
      if (/from "principals"/i.test(sql)) {
        return [["human", "operator"]];
      }
      return [];
    });
    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createDrizzleAuditSink(db, { fallback });

    await sink.emit({
      name: "agent_credential.issued_by_operator",
      principal_id: PID,
      correlation_id: "c-1",
      payload: { credential_id: "cid-1" },
    });

    expect(fallbackEvents).toHaveLength(0);

    const insertCall = captured.find((c) => /insert into "audit_events_buffer"/i.test(c.sql));
    expect(insertCall).toBeDefined();
    expect(insertCall!.params).toContain(PID);
    expect(insertCall!.params).toContain("human");
    expect(insertCall!.params).toContain("operator");
    expect(insertCall!.params).toContain("c-1");
    expect(insertCall!.params).toContain("agent_credential.issued_by_operator");
  });

  it("falls back to console when the event has no principal_id", async () => {
    const { db, captured } = makeFakeDb(() => []);
    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createDrizzleAuditSink(db, { fallback });

    await sink.emit({
      name: "service_credential.rejected_vercel_oidc",
      correlation_id: "c-2",
      payload: { token_kind: "vercel_oidc" },
    });

    expect(fallbackEvents).toHaveLength(1);
    expect(captured.find((c) => /insert into "audit_events_buffer"/i.test(c.sql))).toBeUndefined();
  });

  it("falls back to console when the principal is not (yet) materialized", async () => {
    const { db } = makeFakeDb(() => []); // empty principals lookup
    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createDrizzleAuditSink(db, { fallback });

    await sink.emit({
      name: "agent_credential.issued_by_operator",
      principal_id: PID,
      correlation_id: "c-3",
      payload: {},
    });

    expect(fallbackEvents).toHaveLength(1);
  });

  it("falls back to console when the DB insert throws", async () => {
    const db = drizzle(
      async (sql) => {
        if (/from "principals"/i.test(sql)) return { rows: [["human", "operator"]] };
        throw new Error("db down");
      },
      { schema },
    ) as unknown as Db;

    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createDrizzleAuditSink(db, { fallback });

    await sink.emit({
      name: "agent_credential.issued_by_operator",
      principal_id: PID,
      correlation_id: "c-4",
      payload: {},
    });

    expect(fallbackEvents).toHaveLength(1);
  });

  it("rejects unknown principal kinds (defense-in-depth) and falls back", async () => {
    const { db } = makeFakeDb((sql) => {
      if (/from "principals"/i.test(sql)) return [["something_else", null]];
      return [];
    });
    const { sink: fallback, events: fallbackEvents } = makeFallback();
    const sink = createDrizzleAuditSink(db, { fallback });

    await sink.emit({
      name: "agent_credential.issued_by_operator",
      principal_id: PID,
      correlation_id: "c-5",
      payload: {},
    });

    expect(fallbackEvents).toHaveLength(1);
  });
});
