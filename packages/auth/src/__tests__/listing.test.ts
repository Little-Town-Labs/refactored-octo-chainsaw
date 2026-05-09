// F02 T047b — Tests for `listAgentCredentialsForOperator`.

import {
  DEFAULT_LIST_LIMIT,
  InvalidCursorError,
  MAX_LIST_LIMIT,
  listAgentCredentialsForOperator,
  type AgentCredentialListFilter,
  type AgentCredentialListRepo,
  type AgentCredentialListRow,
} from "../issuer/listing.js";
import { RoleRequiredError } from "../authorize.js";
import type { AgentPrincipal, HumanPrincipal, ServicePrincipal } from "../principal.js";

const NOW_SEC = 1_700_000_000;

const operator: HumanPrincipal = {
  kind: "human",
  principal_id: "00000000-0000-0000-0000-00000000op00",
  tier: "operator",
  org_id: null,
  external_id: "user_op",
  aal: "aal2",
  disabled_at: null,
};

const agent: AgentPrincipal = {
  kind: "agent",
  principal_id: "00000000-0000-0000-0000-00000000ag00",
  scopes: [],
  run_id: "00000000-0000-0000-0000-00000000ru00",
  side: "seeker",
  contract_id: "c-1",
  contract_version: "v1",
  ticket_id: "00000000-0000-0000-0000-00000000ti00",
};

const service: ServicePrincipal = {
  kind: "service",
  principal_id: "00000000-0000-0000-0000-00000000sv00",
  scopes: ["auth.revocation_list.read"],
  rotation_generation: 1,
};

function makeRow(
  overrides: Partial<AgentCredentialListRow> & { issued_at: Date; credential_id: string },
): AgentCredentialListRow {
  return {
    principal_id: "00000000-0000-0000-0000-00000000ag00",
    run_id: "00000000-0000-0000-0000-00000000ru00",
    side: "seeker",
    contract_id: "c-1",
    contract_version: "v1",
    scope_set: ["dossier.read"],
    expires_at: new Date(overrides.issued_at.getTime() + 1800_000),
    revoked_at: null,
    revocation_reason: null,
    ...overrides,
  };
}

function makeRepo(rows: AgentCredentialListRow[]) {
  const calls: AgentCredentialListFilter[] = [];
  let nextThrows: Error | null = null;
  const repo: AgentCredentialListRepo = {
    async list(filter) {
      calls.push(filter);
      if (nextThrows) {
        const err = nextThrows;
        nextThrows = null;
        throw err;
      }
      let view = [...rows];
      if (filter.status === "active") {
        view = view.filter((r) => r.revoked_at === null && r.expires_at > filter.now);
      } else if (filter.status === "revoked") {
        view = view.filter((r) => r.revoked_at !== null);
      }
      if (filter.principal_id !== undefined) {
        view = view.filter((r) => r.principal_id === filter.principal_id);
      }
      view.sort((a, b) => {
        const da = b.issued_at.getTime() - a.issued_at.getTime();
        return da !== 0 ? da : b.credential_id.localeCompare(a.credential_id);
      });
      if (filter.cursor_issued_at && filter.cursor_credential_id) {
        const cur_iat = filter.cursor_issued_at.getTime();
        const cur_id = filter.cursor_credential_id;
        view = view.filter((r) => {
          const iat = r.issued_at.getTime();
          if (iat !== cur_iat) return iat < cur_iat;
          return r.credential_id < cur_id;
        });
      }
      return view.slice(0, filter.limit);
    },
  };
  return {
    repo,
    calls,
    failNext(e: Error) {
      nextThrows = e;
    },
  };
}

const deps = (rows: AgentCredentialListRow[]) => {
  const r = makeRepo(rows);
  return { ...r, depObj: { repo: r.repo, now: () => NOW_SEC } };
};

describe("listAgentCredentialsForOperator", () => {
  it("operator sees rows", async () => {
    const r1 = makeRow({ credential_id: "cid-2", issued_at: new Date(NOW_SEC * 1000 - 1000) });
    const r2 = makeRow({ credential_id: "cid-1", issued_at: new Date(NOW_SEC * 1000 - 5000) });
    const { depObj } = deps([r1, r2]);
    const out = await listAgentCredentialsForOperator(operator, {}, depObj);
    expect(out.rows.map((r) => r.credential_id)).toEqual(["cid-2", "cid-1"]);
    expect(out.next_cursor).toBeNull();
  });

  it("non-operator human is denied", async () => {
    const { depObj } = deps([]);
    await expect(
      listAgentCredentialsForOperator({ ...operator, tier: "employer" }, {}, depObj),
    ).rejects.toBeInstanceOf(RoleRequiredError);
  });

  it("agent principal is denied", async () => {
    const { depObj } = deps([]);
    await expect(listAgentCredentialsForOperator(agent, {}, depObj)).rejects.toBeInstanceOf(
      RoleRequiredError,
    );
  });

  it("service principal is denied (operator-only surface)", async () => {
    const { depObj } = deps([]);
    await expect(listAgentCredentialsForOperator(service, {}, depObj)).rejects.toBeInstanceOf(
      RoleRequiredError,
    );
  });

  it("paginates with opaque cursor and stops when fewer rows than limit returned", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({
        credential_id: `cid-${5 - i}`,
        issued_at: new Date(NOW_SEC * 1000 - i * 1000),
      }),
    );
    const { depObj } = deps(rows);

    const page1 = await listAgentCredentialsForOperator(operator, { limit: 2 }, depObj);
    expect(page1.rows.map((r) => r.credential_id)).toEqual(["cid-5", "cid-4"]);
    expect(page1.next_cursor).not.toBeNull();

    const page2 = await listAgentCredentialsForOperator(
      operator,
      { limit: 2, cursor: page1.next_cursor! },
      depObj,
    );
    expect(page2.rows.map((r) => r.credential_id)).toEqual(["cid-3", "cid-2"]);
    expect(page2.next_cursor).not.toBeNull();

    const page3 = await listAgentCredentialsForOperator(
      operator,
      { limit: 2, cursor: page2.next_cursor! },
      depObj,
    );
    expect(page3.rows.map((r) => r.credential_id)).toEqual(["cid-1"]);
    expect(page3.next_cursor).toBeNull();
  });

  it("breaks ties on equal issued_at by credential_id (DESC) across pages", async () => {
    const sameTime = new Date(NOW_SEC * 1000 - 1000);
    const rows = [
      makeRow({ credential_id: "cid-aa", issued_at: sameTime }),
      makeRow({ credential_id: "cid-bb", issued_at: sameTime }),
      makeRow({ credential_id: "cid-cc", issued_at: sameTime }),
    ];
    const { depObj } = deps(rows);
    const page1 = await listAgentCredentialsForOperator(operator, { limit: 2 }, depObj);
    expect(page1.rows.map((r) => r.credential_id)).toEqual(["cid-cc", "cid-bb"]);
    const page2 = await listAgentCredentialsForOperator(
      operator,
      { limit: 2, cursor: page1.next_cursor! },
      depObj,
    );
    expect(page2.rows.map((r) => r.credential_id)).toEqual(["cid-aa"]);
    expect(page2.next_cursor).toBeNull();
  });

  it("empty result with cursor returns no rows and null cursor", async () => {
    const { depObj } = deps([]);
    const fakeCursor = Buffer.from(
      JSON.stringify({ iat: new Date(NOW_SEC * 1000).toISOString(), cid: "cid-x" }),
    ).toString("base64url");
    const out = await listAgentCredentialsForOperator(operator, { cursor: fakeCursor }, depObj);
    expect(out.rows).toEqual([]);
    expect(out.next_cursor).toBeNull();
  });

  it("propagates repo errors instead of swallowing", async () => {
    const made = deps([]);
    made.failNext(new Error("db down"));
    await expect(listAgentCredentialsForOperator(operator, {}, made.depObj)).rejects.toThrow(
      "db down",
    );
  });

  it("clamps limit to MAX_LIST_LIMIT and defaults invalid limit", async () => {
    const { depObj, calls } = deps([]);
    await listAgentCredentialsForOperator(operator, { limit: 9999 }, depObj);
    expect(calls[0]!.limit).toBe(MAX_LIST_LIMIT + 1);

    await listAgentCredentialsForOperator(operator, { limit: 0 }, depObj);
    expect(calls[1]!.limit).toBe(DEFAULT_LIST_LIMIT + 1);
  });

  it("rejects invalid cursors with InvalidCursorError", async () => {
    const { depObj } = deps([]);
    await expect(
      listAgentCredentialsForOperator(operator, { cursor: "!!!not-base64!!!" }, depObj),
    ).rejects.toBeInstanceOf(InvalidCursorError);
    await expect(
      listAgentCredentialsForOperator(
        operator,
        { cursor: Buffer.from("not json").toString("base64url") },
        depObj,
      ),
    ).rejects.toBeInstanceOf(InvalidCursorError);
    const wrongTypes = Buffer.from(JSON.stringify({ iat: 123, cid: 456 })).toString("base64url");
    await expect(
      listAgentCredentialsForOperator(operator, { cursor: wrongTypes }, depObj),
    ).rejects.toBeInstanceOf(InvalidCursorError);
    const badDate = Buffer.from(JSON.stringify({ iat: "not-a-date", cid: "x" })).toString(
      "base64url",
    );
    await expect(
      listAgentCredentialsForOperator(operator, { cursor: badDate }, depObj),
    ).rejects.toBeInstanceOf(InvalidCursorError);
  });

  it("status='active' filter excludes revoked rows and is forwarded to repo", async () => {
    const live = makeRow({ credential_id: "cid-live", issued_at: new Date(NOW_SEC * 1000 - 1000) });
    const revoked = makeRow({
      credential_id: "cid-revoked",
      issued_at: new Date(NOW_SEC * 1000 - 5000),
      revoked_at: new Date(NOW_SEC * 1000 - 4000),
      revocation_reason: "compromise:test",
    });
    const { depObj, calls } = deps([live, revoked]);
    const out = await listAgentCredentialsForOperator(operator, { status: "active" }, depObj);
    expect(out.rows.map((r) => r.credential_id)).toEqual(["cid-live"]);
    expect(calls[0]!.status).toBe("active");
  });

  it("status='revoked' surfaces revoked_at and revocation_reason on the rows", async () => {
    const revokedAt = new Date(NOW_SEC * 1000 - 4000);
    const revoked = makeRow({
      credential_id: "cid-revoked",
      issued_at: new Date(NOW_SEC * 1000 - 5000),
      revoked_at: revokedAt,
      revocation_reason: "compromise:test",
    });
    const { depObj } = deps([revoked]);
    const out = await listAgentCredentialsForOperator(operator, { status: "revoked" }, depObj);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]!.revoked_at).toEqual(revokedAt);
    expect(out.rows[0]!.revocation_reason).toBe("compromise:test");
  });

  it("principal_id filter is forwarded and trims results", async () => {
    const a = makeRow({
      credential_id: "cid-a",
      issued_at: new Date(NOW_SEC * 1000),
      principal_id: "00000000-0000-0000-0000-0000000000aa",
    });
    const b = makeRow({
      credential_id: "cid-b",
      issued_at: new Date(NOW_SEC * 1000 - 1000),
      principal_id: "00000000-0000-0000-0000-0000000000bb",
    });
    const { depObj, calls } = deps([a, b]);
    const out = await listAgentCredentialsForOperator(
      operator,
      { principal_id: "00000000-0000-0000-0000-0000000000aa" },
      depObj,
    );
    expect(out.rows.map((r) => r.credential_id)).toEqual(["cid-a"]);
    expect(calls[0]!.principal_id).toBe("00000000-0000-0000-0000-0000000000aa");
  });
});
