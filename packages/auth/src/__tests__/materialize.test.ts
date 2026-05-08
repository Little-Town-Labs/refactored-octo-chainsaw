// F02 T021 — Tests for `materializePrincipal` (test-first).
//
// Cover the lazy + eager paths (EC-1, EC-2), the org-mirroring side
// effect, idempotency, audit emission (NFR-10), and the
// `disabled_at` enforcement (member-removal, FR-34).

import {
  materializePrincipal,
  PrincipalDisabledError,
  PrincipalSnapshotInvariantError,
} from "../materialize/materialize.js";
import type {
  AuditEventSink,
  OrganizationLookup,
  PrincipalLookup,
  PrincipalRepo,
  PrincipalSnapshot,
} from "../materialize/types.js";
import { isHumanPrincipal } from "../principal.js";

// ── In-memory fake repo ─────────────────────────────────────────────

class FakeRepo implements PrincipalRepo {
  private orgs = new Map<string, OrganizationLookup>();
  private principals = new Map<string, PrincipalLookup>();
  public upsertHumanCalls = 0;
  public upsertOrgCalls = 0;

  private orgKey(clerkOrgId: string): string {
    return clerkOrgId;
  }
  private principalKey(externalId: string, orgId: string | null): string {
    return `${externalId}::${orgId ?? "_no_org"}`;
  }

  async findOrganizationByClerkId(clerkOrgId: string) {
    return this.orgs.get(this.orgKey(clerkOrgId)) ?? null;
  }
  async upsertOrganization(input: {
    clerk_org_id: string;
    kind: "employer" | "operator";
    display_name: string;
  }) {
    this.upsertOrgCalls += 1;
    const existing = this.orgs.get(this.orgKey(input.clerk_org_id));
    if (existing) return existing;
    const org: OrganizationLookup = {
      org_id: `org-uuid-${this.orgs.size + 1}`,
      clerk_org_id: input.clerk_org_id,
      kind: input.kind,
    };
    this.orgs.set(this.orgKey(input.clerk_org_id), org);
    return org;
  }

  async findHumanPrincipal(input: { external_id: string; org_id: string | null }) {
    return this.principals.get(this.principalKey(input.external_id, input.org_id)) ?? null;
  }
  async upsertHumanPrincipal(input: {
    external_id: string;
    tier: PrincipalSnapshot["tier"];
    org_id: string | null;
    display_name: string | null;
  }) {
    this.upsertHumanCalls += 1;
    const key = this.principalKey(input.external_id, input.org_id);
    const existing = this.principals.get(key);
    if (existing) {
      // Real repo would update tier / display_name; mirror that here.
      const updated: PrincipalLookup = {
        principal_id: existing.principal_id,
        external_id: input.external_id,
        tier: input.tier,
        org_id: input.org_id,
        disabled_at: existing.disabled_at,
      };
      this.principals.set(key, updated);
      return updated;
    }
    const created: PrincipalLookup = {
      principal_id: `principal-uuid-${this.principals.size + 1}`,
      external_id: input.external_id,
      tier: input.tier,
      org_id: input.org_id,
      disabled_at: null,
    };
    this.principals.set(key, created);
    return created;
  }

  async disablePrincipal(input: {
    external_id: string;
    org_id: string | null;
    reason: string;
  }): Promise<void> {
    void input.reason;
    const key = this.principalKey(input.external_id, input.org_id);
    const existing = this.principals.get(key);
    if (!existing) return;
    this.principals.set(key, { ...existing, disabled_at: new Date(2026, 4, 8) });
  }
}

class RecordingSink implements AuditEventSink {
  events: Array<Parameters<AuditEventSink["emit"]>[0]> = [];
  async emit(event: Parameters<AuditEventSink["emit"]>[0]): Promise<void> {
    this.events.push(event);
  }
}

// ── Tests ───────────────────────────────────────────────────────────

const baseClock = () => 1_700_000_000;
const correlationId = "corr-test-1";

describe("materializePrincipal — seeker path (Story 1, EC-1)", () => {
  it("creates a principal row on first lazy materialization", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    const snap: PrincipalSnapshot = {
      external_id: "user_clerk_seeker_1",
      tier: "seeker",
    };

    const result = await materializePrincipal({
      repo,
      sink,
      snapshot: snap,
      source: "lazy",
      correlation_id: correlationId,
      now: baseClock,
    });

    expect(isHumanPrincipal(result)).toBe(true);
    expect(result.external_id).toBe("user_clerk_seeker_1");
    expect(result.tier).toBe("seeker");
    expect(result.org_id).toBeUndefined();
    expect(repo.upsertHumanCalls).toBe(1);
    expect(repo.upsertOrgCalls).toBe(0);
  });

  it("emits a principal.materialized audit event with the materialization source", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    await materializePrincipal({
      repo,
      sink,
      snapshot: { external_id: "user_clerk_seeker_2", tier: "seeker" },
      source: "lazy",
      correlation_id: correlationId,
      now: baseClock,
    });
    expect(sink.events).toHaveLength(1);
    const ev = sink.events[0]!;
    expect(ev.name).toBe("principal.materialized");
    expect(ev.payload.materialization).toBe("lazy");
    expect(ev.correlation_id).toBe(correlationId);
  });

  it("is idempotent on repeated calls (returns same principal_id)", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    const snap: PrincipalSnapshot = { external_id: "user_clerk_seeker_3", tier: "seeker" };
    const a = await materializePrincipal({
      repo,
      sink,
      snapshot: snap,
      source: "eager",
      correlation_id: "corr-1",
      now: baseClock,
    });
    const b = await materializePrincipal({
      repo,
      sink,
      snapshot: snap,
      source: "lazy",
      correlation_id: "corr-2",
      now: baseClock,
    });
    expect(a.principal_id).toBe(b.principal_id);
    // Second call hits the find path; only the first call writes.
    expect(repo.upsertHumanCalls).toBe(1);
    // But both calls emit an audit event with their respective sources.
    expect(sink.events.map((e) => e.payload.materialization)).toEqual(["eager", "lazy"]);
  });
});

describe("materializePrincipal — employer path (Story 2)", () => {
  it("mirrors the org row on first encounter, then reuses it", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    const snap: PrincipalSnapshot = {
      external_id: "user_clerk_emp_admin",
      tier: "employer_admin",
      org_clerk_id: "org_clerk_acme",
      org_kind: "employer",
      org_display_name: "Acme Corp",
    };
    await materializePrincipal({
      repo,
      sink,
      snapshot: snap,
      source: "eager",
      correlation_id: correlationId,
      now: baseClock,
    });
    // Second user joining the same org should NOT re-create the org row.
    await materializePrincipal({
      repo,
      sink,
      snapshot: { ...snap, external_id: "user_clerk_emp_member", tier: "employer_member" },
      source: "eager",
      correlation_id: correlationId,
      now: baseClock,
    });
    expect(repo.upsertOrgCalls).toBe(1);
  });

  it("rejects employer_admin / employer_member without org_clerk_id (data-model invariant)", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    await expect(
      materializePrincipal({
        repo,
        sink,
        snapshot: { external_id: "user_x", tier: "employer_admin" },
        source: "lazy",
        correlation_id: correlationId,
        now: baseClock,
      }),
    ).rejects.toBeInstanceOf(PrincipalSnapshotInvariantError);
  });
});

describe("materializePrincipal — operator path (Story 3, FR-9)", () => {
  it("requires org_kind === 'operator' for tier='operator'", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    await expect(
      materializePrincipal({
        repo,
        sink,
        snapshot: {
          external_id: "user_clerk_op",
          tier: "operator",
          org_clerk_id: "org_clerk_employer_acme",
          org_kind: "employer", // wrong kind for operator tier
          org_display_name: "Acme Corp",
        },
        source: "lazy",
        correlation_id: correlationId,
        now: baseClock,
      }),
    ).rejects.toBeInstanceOf(PrincipalSnapshotInvariantError);
  });

  it("creates an operator principal under an operator org", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    const result = await materializePrincipal({
      repo,
      sink,
      snapshot: {
        external_id: "user_clerk_op_2",
        tier: "operator",
        org_clerk_id: "org_clerk_spyglass_ops",
        org_kind: "operator",
        org_display_name: "Spyglass Operators",
      },
      source: "eager",
      correlation_id: correlationId,
      now: baseClock,
    });
    expect(result.tier).toBe("operator");
    expect(result.org_id).toBe("org-uuid-1");
  });
});

describe("materializePrincipal — disabled state (FR-34, EC-12)", () => {
  it("throws PrincipalDisabledError when the principal is disabled", async () => {
    const repo = new FakeRepo();
    const sink = new RecordingSink();
    const snap: PrincipalSnapshot = { external_id: "user_disabled", tier: "seeker" };
    await materializePrincipal({
      repo,
      sink,
      snapshot: snap,
      source: "eager",
      correlation_id: correlationId,
      now: baseClock,
    });
    await repo.disablePrincipal({
      external_id: "user_disabled",
      org_id: null,
      reason: "test removal",
    });
    await expect(
      materializePrincipal({
        repo,
        sink,
        snapshot: snap,
        source: "lazy",
        correlation_id: correlationId,
        now: baseClock,
      }),
    ).rejects.toBeInstanceOf(PrincipalDisabledError);
  });
});
