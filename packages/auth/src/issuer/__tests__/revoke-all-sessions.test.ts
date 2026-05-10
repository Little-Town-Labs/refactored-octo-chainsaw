// F02 T059b — Tests for the two-operator-gated
// `revokeAllSessionsForPrincipal` orchestrator.
//
// Pure state-machine tests: in-memory fakes for the approval repo,
// principal lookup, session revoker, and audit sink. The orchestrator
// itself owns the state machine; Drizzle adapters live in apps/web.

import {
  ApprovalAlreadyExecutedError,
  ApprovalNotFoundError,
  revokeAllSessionsForPrincipal,
  SelfApprovalError,
  TargetNotFoundError,
  type ApprovalRecord,
  type PrincipalKindLookup,
  type RevokeAllApprovalRepo,
  type SessionRevoker,
} from "../revoke-all-sessions.js";
import { RoleRequiredError } from "../../authorize.js";
import type { AgentPrincipal, HumanPrincipal, ServicePrincipal } from "../../principal.js";
import type { AuditEventSink, AuditEventName } from "../../materialize/types.js";

const OP_A_ID = "00000000-0000-0000-0000-0000000000a1";
const OP_B_ID = "00000000-0000-0000-0000-0000000000b2";
const OP_TARGET_ID = "00000000-0000-0000-0000-0000000000c3";
const OP_TARGET2_ID = "00000000-0000-0000-0000-0000000000c4";
const SEEKER_TARGET_ID = "00000000-0000-0000-0000-0000000000d4";

function operator(principal_id: string): HumanPrincipal {
  return {
    kind: "human",
    principal_id,
    issued_at: 0,
    correlation_id: "test",
    tier: "operator",
    external_idp: "clerk",
    external_id: `user_${principal_id}`,
    org_id: "00000000-0000-0000-0000-0000000000aa",
  };
}

function agent(): AgentPrincipal {
  return {
    kind: "agent",
    principal_id: "00000000-0000-0000-0000-0000000000e5",
    issued_at: 0,
    correlation_id: "test",
    run_id: "00000000-0000-0000-0000-0000000000f6",
    side: "seeker",
    contract_id: "c-1",
    contract_version: "v1",
    ticket_id: "t-1",
    scopes: ["dossier.read"],
  };
}

function service(): ServicePrincipal {
  return {
    kind: "service",
    principal_id: "00000000-0000-0000-0000-00000000aa11",
    issued_at: 0,
    correlation_id: "test",
    service_name: "runner",
    service_version: "v1",
    scopes: [],
  };
}

interface ApprovalRow extends ApprovalRecord {
  reason_code: string;
  notes: string | null;
}

function makeFakeApprovalRepo(): RevokeAllApprovalRepo & { rows: Map<string, ApprovalRow> } {
  const rows = new Map<string, ApprovalRow>();
  let nextId = 1000;
  return {
    rows,
    async insertApproval(input) {
      const approval_id = `00000000-0000-0000-0000-${String(nextId++).padStart(12, "0")}`;
      rows.set(approval_id, {
        approval_id,
        target_principal_id: input.target_principal_id,
        initiated_by: input.initiated_by,
        initiated_at: input.initiated_at,
        expires_at: input.expires_at,
        executed_at: null,
        reason_code: input.reason_code,
        notes: input.notes,
      });
      return { approval_id };
    },
    async findApproval(approval_id) {
      return rows.get(approval_id) ?? null;
    },
    async markApproved(input) {
      const row = rows.get(input.approval_id);
      if (!row || row.executed_at !== null) return false;
      rows.set(input.approval_id, { ...row, executed_at: input.executed_at });
      return true;
    },
  };
}

function makeFakeLookup(
  table: ReadonlyMap<
    string,
    { kind: "human"; tier: string; external_id: string } | { kind: "agent" | "service" }
  >,
): PrincipalKindLookup {
  return {
    async lookupTarget(principal_id) {
      return table.get(principal_id) ?? null;
    },
  };
}

function makeFakeRevoker(): SessionRevoker & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async revokeAllSessionsForExternalId({ external_id }) {
      calls.push(external_id);
    },
  };
}

interface RecordedEvent {
  name: AuditEventName;
  principal_id?: string;
  payload: Readonly<Record<string, unknown>>;
}

function makeFakeSink(): AuditEventSink & { events: RecordedEvent[] } {
  const events: RecordedEvent[] = [];
  return {
    events,
    async emit(e) {
      events.push({ name: e.name, principal_id: e.principal_id, payload: e.payload });
    },
  };
}

const FIXED_NOW = 1_777_000_000;

function makeDeps() {
  const approvalRepo = makeFakeApprovalRepo();
  const sessionRevoker = makeFakeRevoker();
  const sink = makeFakeSink();
  const lookup = makeFakeLookup(
    new Map([
      [OP_TARGET_ID, { kind: "human", tier: "operator", external_id: "user_op_target" }],
      [OP_TARGET2_ID, { kind: "human", tier: "operator", external_id: "user_op_target_2" }],
      [SEEKER_TARGET_ID, { kind: "human", tier: "seeker", external_id: "user_seeker" }],
    ]),
  );
  return {
    approvalRepo,
    principalLookup: lookup,
    sessionRevoker,
    sink,
    now: () => FIXED_NOW,
    correlationId: () => "cid-test",
  };
}

describe("revokeAllSessionsForPrincipal — authorization", () => {
  it("denies non-operator humans (RoleRequiredError) and audits revoke_all_denied", async () => {
    const deps = makeDeps();
    const seeker: HumanPrincipal = { ...operator(OP_A_ID), tier: "seeker" };
    await expect(
      revokeAllSessionsForPrincipal(
        seeker,
        { target_principal_id: SEEKER_TARGET_ID, reason_code: "operator_emergency" },
        deps,
      ),
    ).rejects.toBeInstanceOf(RoleRequiredError);
    expect(deps.sessionRevoker.calls).toEqual([]);
    expect(deps.sink.events).toHaveLength(1);
    expect(deps.sink.events[0]!.name).toBe("human_sessions.revoke_all_denied");
    expect(deps.sink.events[0]!.payload).toMatchObject({ reason: "caller_not_operator" });
  });

  it("denies agent callers", async () => {
    const deps = makeDeps();
    await expect(
      revokeAllSessionsForPrincipal(
        agent(),
        { target_principal_id: SEEKER_TARGET_ID, reason_code: "operator_emergency" },
        deps,
      ),
    ).rejects.toBeInstanceOf(RoleRequiredError);
  });

  it("denies service callers", async () => {
    const deps = makeDeps();
    await expect(
      revokeAllSessionsForPrincipal(
        service(),
        { target_principal_id: SEEKER_TARGET_ID, reason_code: "operator_emergency" },
        deps,
      ),
    ).rejects.toBeInstanceOf(RoleRequiredError);
  });
});

describe("revokeAllSessionsForPrincipal — non-operator target (fast path)", () => {
  it("executes immediately and emits human_sessions.revoked_all", async () => {
    const deps = makeDeps();
    const result = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      { target_principal_id: SEEKER_TARGET_ID, reason_code: "operator_emergency" },
      deps,
    );
    expect(result.status).toBe("executed");
    if (result.status === "executed") {
      expect(result.approval_id).toBeNull();
      expect(result.executed_at).toBe(FIXED_NOW);
    }
    expect(deps.sessionRevoker.calls).toEqual(["user_seeker"]);
    expect(deps.sink.events).toHaveLength(1);
    expect(deps.sink.events[0]!.name).toBe("human_sessions.revoked_all");
    expect(deps.sink.events[0]!.payload).toMatchObject({
      target_principal_id: SEEKER_TARGET_ID,
      two_operator_gated: false,
    });
  });

  it("rejects unknown target with TargetNotFoundError (no audit, no revocation)", async () => {
    const deps = makeDeps();
    await expect(
      revokeAllSessionsForPrincipal(
        operator(OP_A_ID),
        {
          target_principal_id: "00000000-0000-0000-0000-0000000000ff",
          reason_code: "operator_emergency",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(TargetNotFoundError);
    expect(deps.sessionRevoker.calls).toEqual([]);
  });
});

describe("revokeAllSessionsForPrincipal — operator target (two-operator gate)", () => {
  it("first call (no approval_id) creates a pending approval and emits initiated", async () => {
    const deps = makeDeps();
    const result = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      {
        target_principal_id: OP_TARGET_ID,
        reason_code: "compromise_suspected",
        notes: "Slack thread #incident-42",
      },
      deps,
    );
    expect(result.status).toBe("pending_approval");
    if (result.status === "pending_approval") {
      expect(result.approval_id).toBeTruthy();
      // Default TTL = 15 min = 900s.
      expect(result.expires_at).toBe(FIXED_NOW + 900);
    }
    expect(deps.sessionRevoker.calls).toEqual([]);
    expect(deps.sink.events).toHaveLength(1);
    expect(deps.sink.events[0]!.name).toBe("human_sessions.revoke_all_initiated");
    expect(deps.sink.events[0]!.payload).toMatchObject({
      target_principal_id: OP_TARGET_ID,
      reason_code: "compromise_suspected",
    });
  });

  it("second operator with valid approval_id executes and emits revoked_all gated=true", async () => {
    const deps = makeDeps();
    const first = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      { target_principal_id: OP_TARGET_ID, reason_code: "operator_emergency" },
      deps,
    );
    if (first.status !== "pending_approval") throw new Error("expected pending");

    const second = await revokeAllSessionsForPrincipal(
      operator(OP_B_ID),
      {
        target_principal_id: OP_TARGET_ID,
        reason_code: "operator_emergency",
        approval_id: first.approval_id,
      },
      deps,
    );
    expect(second.status).toBe("executed");
    expect(deps.sessionRevoker.calls).toEqual(["user_op_target"]);
    const lastEvent = deps.sink.events[deps.sink.events.length - 1]!;
    expect(lastEvent.name).toBe("human_sessions.revoked_all");
    expect(lastEvent.payload).toMatchObject({
      target_principal_id: OP_TARGET_ID,
      two_operator_gated: true,
      approval_id: first.approval_id,
      approved_by: OP_B_ID,
    });
  });

  it("same operator approving own request → SelfApprovalError + denied audit", async () => {
    const deps = makeDeps();
    const first = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      { target_principal_id: OP_TARGET_ID, reason_code: "operator_emergency" },
      deps,
    );
    if (first.status !== "pending_approval") throw new Error("expected pending");

    await expect(
      revokeAllSessionsForPrincipal(
        operator(OP_A_ID),
        {
          target_principal_id: OP_TARGET_ID,
          reason_code: "operator_emergency",
          approval_id: first.approval_id,
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(SelfApprovalError);
    expect(deps.sessionRevoker.calls).toEqual([]);
    const lastEvent = deps.sink.events[deps.sink.events.length - 1]!;
    expect(lastEvent.name).toBe("human_sessions.revoke_all_denied");
    expect(lastEvent.payload).toMatchObject({ reason: "self_approval" });
  });

  it("unknown approval_id → ApprovalNotFoundError + denied audit", async () => {
    const deps = makeDeps();
    await expect(
      revokeAllSessionsForPrincipal(
        operator(OP_B_ID),
        {
          target_principal_id: OP_TARGET_ID,
          reason_code: "operator_emergency",
          approval_id: "00000000-0000-0000-0000-deadbeefdead",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(ApprovalNotFoundError);
    const lastEvent = deps.sink.events[deps.sink.events.length - 1]!;
    expect(lastEvent.name).toBe("human_sessions.revoke_all_denied");
    expect(lastEvent.payload).toMatchObject({ reason: "approval_not_found" });
  });

  it("expired approval → ApprovalNotFoundError + denied audit (TTL elapsed)", async () => {
    const deps = makeDeps();
    const first = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      { target_principal_id: OP_TARGET_ID, reason_code: "operator_emergency" },
      deps,
    );
    if (first.status !== "pending_approval") throw new Error("expected pending");

    // Advance time past the 15-minute TTL.
    const expiredDeps = { ...deps, now: () => FIXED_NOW + 901 };
    await expect(
      revokeAllSessionsForPrincipal(
        operator(OP_B_ID),
        {
          target_principal_id: OP_TARGET_ID,
          reason_code: "operator_emergency",
          approval_id: first.approval_id,
        },
        expiredDeps,
      ),
    ).rejects.toBeInstanceOf(ApprovalNotFoundError);
    const lastEvent = deps.sink.events[deps.sink.events.length - 1]!;
    expect(lastEvent.name).toBe("human_sessions.revoke_all_denied");
    expect(lastEvent.payload).toMatchObject({ reason: "approval_expired" });
  });

  it("approval already executed → ApprovalAlreadyExecutedError on replay", async () => {
    const deps = makeDeps();
    const first = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      { target_principal_id: OP_TARGET_ID, reason_code: "operator_emergency" },
      deps,
    );
    if (first.status !== "pending_approval") throw new Error("expected pending");

    await revokeAllSessionsForPrincipal(
      operator(OP_B_ID),
      {
        target_principal_id: OP_TARGET_ID,
        reason_code: "operator_emergency",
        approval_id: first.approval_id,
      },
      deps,
    );
    // Second approval call with the same id should fail.
    await expect(
      revokeAllSessionsForPrincipal(
        operator(OP_B_ID),
        {
          target_principal_id: OP_TARGET_ID,
          reason_code: "operator_emergency",
          approval_id: first.approval_id,
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(ApprovalAlreadyExecutedError);
  });

  it("approval_id with mismatched target_principal_id is rejected (cross-target replay guard)", async () => {
    const deps = makeDeps();
    // Approval was opened against OP_TARGET_ID...
    const first = await revokeAllSessionsForPrincipal(
      operator(OP_A_ID),
      { target_principal_id: OP_TARGET_ID, reason_code: "operator_emergency" },
      deps,
    );
    if (first.status !== "pending_approval") throw new Error("expected pending");

    // ...so re-using it against a different operator target must
    // fail (testing replay guard, so the second target must also
    // hit the two-operator gate path).
    await expect(
      revokeAllSessionsForPrincipal(
        operator(OP_B_ID),
        {
          target_principal_id: OP_TARGET2_ID,
          reason_code: "operator_emergency",
          approval_id: first.approval_id,
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(ApprovalNotFoundError);
  });
});
