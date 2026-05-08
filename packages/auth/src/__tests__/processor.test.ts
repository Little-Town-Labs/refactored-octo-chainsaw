// F02 T025 — Webhook directive processor tests (FR-34, EC-2).

import { processClerkDirective, type ClerkSessionRevoker } from "../webhook/processor.js";
import { eventToSnapshot, type SnapshotContext } from "../webhook/snapshot.js";
import type {
  AuditEventSink,
  OrganizationLookup,
  PrincipalLookup,
  PrincipalRepo,
} from "../materialize/types.js";

interface RecordingSink extends AuditEventSink {
  readonly events: Array<Parameters<AuditEventSink["emit"]>[0]>;
}

function makeSink(): RecordingSink {
  const events: RecordingSink["events"] = [];
  return {
    events,
    async emit(event) {
      events.push(event);
    },
  };
}

interface RecordingRevoker extends ClerkSessionRevoker {
  readonly calls: Array<{ external_id: string; reason: string }>;
}

function makeRevoker(): RecordingRevoker {
  const calls: RecordingRevoker["calls"] = [];
  return {
    calls,
    async revokeAllSessionsForUser(input) {
      calls.push(input);
    },
  };
}

interface State {
  orgs: OrganizationLookup[];
  principals: PrincipalLookup[];
  disabled: Array<{ external_id: string; org_id: string | null; reason: string }>;
}

function makeRepo(): { repo: PrincipalRepo; state: State } {
  const state: State = { orgs: [], principals: [], disabled: [] };
  const repo: PrincipalRepo = {
    async findOrganizationByClerkId(clerkOrgId) {
      return state.orgs.find((o) => o.clerk_org_id === clerkOrgId) ?? null;
    },
    async upsertOrganization(input) {
      const lookup: OrganizationLookup = {
        org_id: `org_${state.orgs.length + 1}`,
        clerk_org_id: input.clerk_org_id,
        kind: input.kind,
      };
      state.orgs.push(lookup);
      return lookup;
    },
    async findHumanPrincipal(input) {
      return (
        state.principals.find(
          (p) => p.external_id === input.external_id && p.org_id === input.org_id,
        ) ?? null
      );
    },
    async upsertHumanPrincipal(input) {
      const lookup: PrincipalLookup = {
        principal_id: `p_${state.principals.length + 1}`,
        external_id: input.external_id,
        tier: input.tier,
        org_id: input.org_id,
        disabled_at: null,
      };
      state.principals.push(lookup);
      return lookup;
    },
    async disablePrincipal(input) {
      state.disabled.push(input);
    },
  };
  return { repo, state };
}

const baseDeps = (overrides: {
  repo: PrincipalRepo;
  sink: AuditEventSink;
  revoker: ClerkSessionRevoker;
}) => ({
  repo: overrides.repo,
  sink: overrides.sink,
  sessionRevoker: overrides.revoker,
  now: () => 1_700_000_000,
  correlationId: () => "c-test",
});

const ctx: SnapshotContext = {
  operatorClerkOrgIds: new Set(["org_op_clerk"]),
};

describe("processClerkDirective — materialize (eager path)", () => {
  it("creates a seeker principal from a user.created event", async () => {
    const { repo, state } = makeRepo();
    const sink = makeSink();
    const revoker = makeRevoker();

    const directive = eventToSnapshot(
      {
        type: "user.created",
        data: { id: "user_a", first_name: "A", last_name: null },
      } as never,
      ctx,
    );
    await processClerkDirective(directive, baseDeps({ repo, sink, revoker }));

    expect(state.principals).toHaveLength(1);
    expect(state.principals[0]?.tier).toBe("seeker");
    expect(sink.events.some((e) => e.name === "principal.materialized")).toBe(true);
    const materialized = sink.events.find((e) => e.name === "principal.materialized");
    expect(materialized?.payload).toMatchObject({ materialization: "eager" });
    expect(revoker.calls).toHaveLength(0);
  });

  it("ignores session.removed (no DB / revoker activity)", async () => {
    const { repo, state } = makeRepo();
    const sink = makeSink();
    const revoker = makeRevoker();
    const directive = eventToSnapshot(
      { type: "session.removed", data: { id: "sess_1", user_id: "user_a" } } as never,
      ctx,
    );
    await processClerkDirective(directive, baseDeps({ repo, sink, revoker }));
    expect(state.principals).toHaveLength(0);
    expect(sink.events).toHaveLength(0);
    expect(revoker.calls).toHaveLength(0);
  });
});

describe("processClerkDirective — disable (FR-34 member removal)", () => {
  it("revokes Clerk sessions and disables the principal on organizationMembership.deleted", async () => {
    const { repo, state } = makeRepo();
    const sink = makeSink();
    const revoker = makeRevoker();

    // Seed: pre-existing org + employer member (eager-materialized earlier).
    await repo.upsertOrganization({
      clerk_org_id: "org_acme",
      kind: "employer",
      display_name: "Acme",
    });
    await repo.upsertHumanPrincipal({
      external_id: "user_b",
      tier: "employer_member",
      org_id: state.orgs[0]?.org_id ?? null,
      display_name: null,
    });

    const directive = eventToSnapshot(
      {
        type: "organizationMembership.deleted",
        data: {
          id: "om_1",
          organization: { id: "org_acme", name: "Acme" },
          public_user_data: { user_id: "user_b", first_name: null, last_name: null },
          role: "org:member",
        },
      } as never,
      ctx,
    );
    await processClerkDirective(directive, baseDeps({ repo, sink, revoker }));

    // Sessions revoked FIRST (fail-safe deny).
    expect(revoker.calls).toEqual([
      { external_id: "user_b", reason: "clerk.organizationMembership.deleted" },
    ]);
    // Then DB-side disable, scoped to the right org.
    expect(state.disabled).toEqual([
      {
        external_id: "user_b",
        org_id: state.orgs[0]?.org_id ?? null,
        reason: "clerk.organizationMembership.deleted",
      },
    ]);
    // Audit event emitted.
    const disableEvent = sink.events.find((e) => e.name === "principal.disabled");
    expect(disableEvent).toBeDefined();
    expect(disableEvent?.payload).toMatchObject({
      external_id: "user_b",
      org_clerk_id: "org_acme",
    });
  });

  it("disables a seeker (no org) on user.deleted", async () => {
    const { repo, state } = makeRepo();
    const sink = makeSink();
    const revoker = makeRevoker();

    const directive = eventToSnapshot(
      { type: "user.deleted", data: { id: "user_c", deleted: true } } as never,
      ctx,
    );
    await processClerkDirective(directive, baseDeps({ repo, sink, revoker }));

    expect(revoker.calls[0]).toMatchObject({ external_id: "user_c" });
    expect(state.disabled[0]).toMatchObject({ external_id: "user_c", org_id: null });
  });

  it("revokes sessions before mutating the DB (operation order matters for FR-34)", async () => {
    const { repo } = makeRepo();
    const sink = makeSink();
    const order: string[] = [];

    const orderingRepo: PrincipalRepo = {
      ...repo,
      async disablePrincipal(input) {
        order.push("disable");
        return repo.disablePrincipal(input);
      },
    };
    const orderingRevoker: ClerkSessionRevoker = {
      async revokeAllSessionsForUser(input) {
        order.push("revoke");
        // simulate work
        await Promise.resolve();
        void input;
      },
    };

    const directive = eventToSnapshot(
      { type: "user.deleted", data: { id: "user_x", deleted: true } } as never,
      ctx,
    );
    await processClerkDirective(directive, {
      repo: orderingRepo,
      sink,
      sessionRevoker: orderingRevoker,
      now: () => 0,
      correlationId: () => "c-test",
    });

    expect(order).toEqual(["revoke", "disable"]);
  });
});
