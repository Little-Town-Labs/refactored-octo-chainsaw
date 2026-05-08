// F02 T044/T046/T048 — Revocation orchestration tests.

import {
  AGENT_CREDENTIAL_REVOKE_SCOPE,
  listRevoked,
  pruneExpiredRevocations,
  REVOCATION_LIST_READ_SCOPE,
  revokeAgentCredential,
  type RevocationListEntry,
  type RevocationListRepo,
  type RevokeRepo,
} from "../issuer/revocation.js";
import type { AgentCredentialRow } from "../issuer/issuance.js";
import type { AuditEventSink } from "../materialize/types.js";
import type { HumanPrincipal, ServicePrincipal } from "../principal.js";

function makeSink() {
  const events: Array<Parameters<AuditEventSink["emit"]>[0]> = [];
  return {
    events,
    emit: async (e: Parameters<AuditEventSink["emit"]>[0]) => {
      events.push(e);
    },
  };
}

function makeRepos() {
  const live: AgentCredentialRow[] = [];
  const revoked: Array<{ credential_id: string; reason: string; revoked_by: string }> = [];
  const list: RevocationListEntry[] = [];

  const repo: RevokeRepo = {
    async findActiveByPrincipal(principalId) {
      return live.filter((r) => r.principal_id === principalId && r.revoked_at === null);
    },
    async markRevoked(input) {
      const row = live.find((r) => r.credential_id === input.credential_id);
      if (row) (row as { revoked_at: Date | null }).revoked_at = input.revoked_at;
      revoked.push({
        credential_id: input.credential_id,
        reason: input.reason,
        revoked_by: input.revoked_by,
      });
    },
  };
  const listRepo: RevocationListRepo = {
    async insert(e) {
      list.push(e);
    },
    async list(filter) {
      return list.filter((e) => {
        if (filter.since && e.revoked_at < filter.since) return false;
        if (filter.kinds && !filter.kinds.includes(e.kind)) return false;
        return true;
      });
    },
    async pruneExpired(cutoff) {
      const before = list.length;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i]!.expires_at <= cutoff) list.splice(i, 1);
      }
      return before - list.length;
    },
  };
  return { repo, listRepo, live, revoked, list };
}

const opService: ServicePrincipal = {
  principal_id: "00000000-0000-0000-0000-0000000000s1",
  issued_at: 0,
  correlation_id: "c1",
  kind: "service",
  service_name: "parley-runner",
  service_version: "1.0.0",
  scopes: [AGENT_CREDENTIAL_REVOKE_SCOPE],
};

const operator: HumanPrincipal = {
  principal_id: "00000000-0000-0000-0000-0000000000o1",
  issued_at: 0,
  correlation_id: "c1",
  kind: "human",
  tier: "operator",
  external_idp: "clerk",
  external_id: "user_op",
  org_id: "00000000-0000-0000-0000-0000000000og",
};

function row(overrides: Partial<AgentCredentialRow>): AgentCredentialRow {
  return {
    credential_id: "c_a",
    principal_id: "p_agent",
    run_id: "r_1",
    side: "seeker",
    contract_id: "test-contract-v1",
    contract_version: "1.0.0",
    scope_set: ["dossier.view"],
    kid: "k_test",
    expires_at: new Date("2026-12-31T00:00:00Z"),
    revoked_at: null,
    ...overrides,
  };
}

const baseDeps = (sink: ReturnType<typeof makeSink>, repos: ReturnType<typeof makeRepos>) => ({
  repo: repos.repo,
  listRepo: repos.listRepo,
  sink,
  now: () => 1_700_000_000,
  correlationId: () => "c-test",
});

describe("revokeAgentCredential", () => {
  it("revokes every live credential for the principal and inserts into the revocation list", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    repos.live.push(row({ credential_id: "c_1", principal_id: "p_agent" }));
    repos.live.push(row({ credential_id: "c_2", principal_id: "p_agent" }));
    repos.live.push(row({ credential_id: "c_other", principal_id: "p_other" }));

    const result = await revokeAgentCredential(
      opService,
      { principal_id: "p_agent", reason_code: "compromise_suspected" },
      baseDeps(sink, repos),
    );

    expect(result.revoked_credential_ids.sort()).toEqual(["c_1", "c_2"]);
    expect(result.effective_within_seconds).toBe(60);
    expect(repos.list.map((e) => e.credential_id).sort()).toEqual(["c_1", "c_2"]);
    expect(sink.events.map((e) => e.name)).toEqual(["agent_credential.revoked"]);
  });

  it("is idempotent on already-revoked credentials (no live rows → empty result)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    repos.live.push(row({ credential_id: "c_1", principal_id: "p_x", revoked_at: new Date() }));

    const result = await revokeAgentCredential(
      opService,
      { principal_id: "p_x", reason_code: "run_cancelled" },
      baseDeps(sink, repos),
    );
    expect(result.revoked_credential_ids).toEqual([]);
    expect(repos.list).toHaveLength(0);
    expect(sink.events).toHaveLength(0);
  });

  it("permits an operator caller (FR-21 — tier-based authority; AAL2 enforced upstream)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    repos.live.push(row({ credential_id: "c_1", principal_id: "p_agent" }));

    const result = await revokeAgentCredential(
      operator,
      { principal_id: "p_agent", reason_code: "operator_emergency" },
      baseDeps(sink, repos),
    );
    expect(result.revoked_credential_ids).toEqual(["c_1"]);
    expect(repos.list).toHaveLength(1);
  });

  it("inserts into the revocation list BEFORE marking the credential revoked (fail-safe order)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    repos.live.push(row({ credential_id: "c_1", principal_id: "p_agent" }));
    const order: string[] = [];

    const orderedRepos = {
      ...repos,
      repo: {
        ...repos.repo,
        async markRevoked(input: Parameters<typeof repos.repo.markRevoked>[0]) {
          order.push("mark");
          await repos.repo.markRevoked(input);
        },
      },
      listRepo: {
        ...repos.listRepo,
        async insert(entry: Parameters<typeof repos.listRepo.insert>[0]) {
          order.push("list");
          await repos.listRepo.insert(entry);
        },
      },
    };
    await revokeAgentCredential(
      opService,
      { principal_id: "p_agent", reason_code: "compromise_suspected" },
      { ...baseDeps(sink, repos), repo: orderedRepos.repo, listRepo: orderedRepos.listRepo },
    );
    expect(order).toEqual(["list", "mark"]);
  });

  it("sanitizes operator notes (caps length, strips control chars)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    repos.live.push(row({ credential_id: "c_1", principal_id: "p_agent" }));
    const longNotes = "evil\x00\nnewlines" + "x".repeat(1000);

    await revokeAgentCredential(
      operator,
      { principal_id: "p_agent", reason_code: "operator_emergency", notes: longNotes },
      baseDeps(sink, repos),
    );
    const reason = repos.revoked[0]?.reason ?? "";
    expect(reason.length).toBeLessThanOrEqual("operator_emergency:".length + 500);
    // eslint-disable-next-line no-control-regex
    expect(reason).not.toMatch(/[\x00-\x1f]/);
  });

  it("does not emit an audit event when no live credentials are found (no-op idempotency)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    // No live rows for this principal.
    const result = await revokeAgentCredential(
      opService,
      { principal_id: "p_unknown", reason_code: "run_cancelled" },
      baseDeps(sink, repos),
    );
    expect(result.revoked_credential_ids).toEqual([]);
    expect(sink.events).toHaveLength(0);
  });

  it("rejects a seeker caller (T046 — scope mismatch fails closed)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    const seeker: HumanPrincipal = { ...operator, tier: "seeker", org_id: undefined as never };
    await expect(
      revokeAgentCredential(
        seeker,
        { principal_id: "p_agent", reason_code: "compromise_suspected" },
        baseDeps(sink, repos),
      ),
    ).rejects.toThrow(/Role/i);
    expect(sink.events).toHaveLength(0);
  });

  it("rejects a service caller without the revoke scope (T046)", async () => {
    const sink = makeSink();
    const repos = makeRepos();
    const lowScope: ServicePrincipal = { ...opService, scopes: ["other.scope"] };
    await expect(
      revokeAgentCredential(
        lowScope,
        { principal_id: "p_agent", reason_code: "run_cancelled" },
        baseDeps(sink, repos),
      ),
    ).rejects.toThrow(/Scope/i);
  });
});

describe("listRevoked", () => {
  const reader: ServicePrincipal = {
    ...opService,
    scopes: [REVOCATION_LIST_READ_SCOPE],
  };

  it("returns the full list when no filter is provided", async () => {
    const repos = makeRepos();
    repos.list.push({
      credential_id: "c_1",
      kind: "agent",
      expires_at: new Date("2026-12-31"),
      revoked_at: new Date("2026-01-01"),
    });
    repos.list.push({
      credential_id: "c_2",
      kind: "service",
      expires_at: new Date("2026-12-31"),
      revoked_at: new Date("2026-02-01"),
    });

    const result = await listRevoked(reader, {}, { listRepo: repos.listRepo });
    expect(result.map((e) => e.credential_id).sort()).toEqual(["c_1", "c_2"]);
  });

  it("filters by `since` (delta refresh)", async () => {
    const repos = makeRepos();
    repos.list.push({
      credential_id: "c_1",
      kind: "agent",
      expires_at: new Date("2026-12-31"),
      revoked_at: new Date("2026-01-01"),
    });
    repos.list.push({
      credential_id: "c_2",
      kind: "agent",
      expires_at: new Date("2026-12-31"),
      revoked_at: new Date("2026-03-01"),
    });
    const sinceUnix = Math.floor(new Date("2026-02-01").getTime() / 1000);
    const result = await listRevoked(reader, { since: sinceUnix }, { listRepo: repos.listRepo });
    expect(result.map((e) => e.credential_id)).toEqual(["c_2"]);
  });

  it("rejects callers missing the read scope", async () => {
    const repos = makeRepos();
    const lowScope: ServicePrincipal = { ...opService, scopes: [] };
    await expect(listRevoked(lowScope, {}, { listRepo: repos.listRepo })).rejects.toThrow(/Scope/i);
  });

  it("rejects non-service callers", async () => {
    const repos = makeRepos();
    await expect(listRevoked(operator, {}, { listRepo: repos.listRepo })).rejects.toThrow(/Role/i);
  });
});

describe("pruneExpiredRevocations (T048)", () => {
  it("deletes only entries whose expires_at is at or before now", async () => {
    const repos = makeRepos();
    repos.list.push({
      credential_id: "c_old",
      kind: "agent",
      expires_at: new Date("2026-01-01"),
      revoked_at: new Date("2025-12-01"),
    });
    repos.list.push({
      credential_id: "c_live",
      kind: "agent",
      expires_at: new Date("2027-01-01"),
      revoked_at: new Date("2026-04-01"),
    });
    const result = await pruneExpiredRevocations({
      listRepo: repos.listRepo,
      now: () => Math.floor(new Date("2026-06-01").getTime() / 1000),
    });
    expect(result.pruned).toBe(1);
    expect(repos.list.map((e) => e.credential_id)).toEqual(["c_live"]);
  });
});
