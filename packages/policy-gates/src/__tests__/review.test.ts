import type {
  GateDecisionHistoryQuery,
  GateDecisionInsert,
  JurisdictionPolicyGateRepository,
} from "../repo.js";
import { POLICY_READ_SCOPE, PolicyScopeRequiredError, type ScopedPrincipal } from "../scopes.js";
import { readActivePosture, readDecisionHistory } from "../review.js";
import type {
  GateDecisionRecord,
  JurisdictionPolicyRevision,
  KillSwitchEventRecord,
  NewJurisdictionPolicyRevision,
  NewKillSwitchEventRecord,
} from "../types.js";

const PRINCIPAL_ID = "11111111-1111-4111-8111-111111111111";

describe("review reads", () => {
  test("requires policy.read for active posture", async () => {
    await expect(
      readActivePosture(new MemoryPolicyGateRepository(), {
        principal: principal([]),
        jurisdictionCodes: ["US-MO"],
      }),
    ).rejects.toBeInstanceOf(PolicyScopeRequiredError);
  });

  test("reads active posture for scoped principals", async () => {
    const repository = new MemoryPolicyGateRepository({
      policies: [
        policy("US-MO", "allowed", null),
        policy("US-MO", "disabled", new Date("2026-05-19T00:00:00.000Z")),
        policy("US-NY", "unsupported", null),
      ],
    });

    await expect(
      readActivePosture(repository, {
        principal: principal([POLICY_READ_SCOPE]),
        jurisdictionCodes: ["us-mo", "US-NY"],
      }),
    ).resolves.toEqual([
      expect.objectContaining({ jurisdiction_code: "US-MO", status: "allowed" }),
      expect.objectContaining({ jurisdiction_code: "US-NY", status: "unsupported" }),
    ]);
  });

  test("requires policy.read for decision history", async () => {
    await expect(
      readDecisionHistory(new MemoryPolicyGateRepository(), {
        principal: principal([]),
        limit: 1,
      }),
    ).rejects.toBeInstanceOf(PolicyScopeRequiredError);
  });

  test("reads bounded decision history with subject, date, jurisdiction, and limit filters", async () => {
    const repository = new MemoryPolicyGateRepository({
      decisions: [
        decision("old", ["US-MO"], new Date("2026-05-18T12:00:00.000Z")),
        decision("keep-1", ["US-MO"], new Date("2026-05-20T12:00:00.000Z")),
        decision("skip-jurisdiction", ["US-NY"], new Date("2026-05-20T13:00:00.000Z")),
        decision("keep-2", ["US-MO"], new Date("2026-05-20T14:00:00.000Z")),
        decision("skip-subject", ["US-MO"], new Date("2026-05-20T15:00:00.000Z"), "match-002"),
        decision(
          "skip-correlation",
          ["US-MO"],
          new Date("2026-05-20T16:00:00.000Z"),
          "match-001",
          "corr-other",
        ),
      ],
    });

    await expect(
      readDecisionHistory(repository, {
        principal: principal([POLICY_READ_SCOPE]),
        correlationId: "corr-batch-001",
        subjectKind: "match_ticket",
        subjectId: "match-001",
        jurisdictionCodes: ["us-mo"],
        from: new Date("2026-05-20T00:00:00.000Z"),
        until: new Date("2026-05-20T23:59:59.000Z"),
        limit: 1,
      }),
    ).resolves.toEqual([expect.objectContaining({ gate_decision_id: "keep-2" })]);
  });
});

class MemoryPolicyGateRepository implements JurisdictionPolicyGateRepository {
  private readonly policies: JurisdictionPolicyRevision[];
  private readonly decisions: GateDecisionRecord[];

  constructor(
    args: {
      readonly policies?: readonly JurisdictionPolicyRevision[];
      readonly decisions?: readonly GateDecisionRecord[];
    } = {},
  ) {
    this.policies = [...(args.policies ?? [])];
    this.decisions = [...(args.decisions ?? [])];
  }

  async getActivePolicies(
    jurisdictionCodes: readonly string[],
  ): Promise<readonly JurisdictionPolicyRevision[]> {
    const codes = new Set(jurisdictionCodes);
    return this.policies.filter(
      (policy) => codes.has(policy.jurisdiction_code) && policy.effective_until === null,
    );
  }

  async listGateDecisions(query: GateDecisionHistoryQuery): Promise<readonly GateDecisionRecord[]> {
    return this.decisions
      .filter((decision) => !query.correlationId || decision.correlation_id === query.correlationId)
      .filter((decision) => !query.subjectKind || decision.subject_kind === query.subjectKind)
      .filter((decision) => !query.subjectId || decision.subject_id === query.subjectId)
      .filter((decision) => !query.from || decision.created_at >= query.from)
      .filter((decision) => !query.until || decision.created_at <= query.until)
      .filter(
        (decision) =>
          !query.jurisdictionCodes ||
          query.jurisdictionCodes.every((code) => decision.jurisdiction_codes.includes(code)),
      )
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, query.limit);
  }

  async insertGateDecision(_input: GateDecisionInsert): Promise<GateDecisionRecord> {
    throw new Error("not needed in review tests");
  }

  async closeActivePolicy(): Promise<void> {
    throw new Error("not needed in review tests");
  }

  async insertPolicyRevision(
    _input: NewJurisdictionPolicyRevision,
  ): Promise<JurisdictionPolicyRevision> {
    throw new Error("not needed in review tests");
  }

  async appendKillSwitchEvent(_input: NewKillSwitchEventRecord): Promise<KillSwitchEventRecord> {
    throw new Error("not needed in review tests");
  }
}

function principal(scopes: readonly string[]): ScopedPrincipal {
  return {
    principal_id: PRINCIPAL_ID,
    principal_kind: "human",
    scopes,
  };
}

function policy(
  jurisdictionCode: string,
  status: JurisdictionPolicyRevision["status"],
  effectiveUntil: Date | null,
): JurisdictionPolicyRevision {
  return {
    jurisdiction_policy_id: `${jurisdictionCode}-${status}`,
    jurisdiction_code: jurisdictionCode,
    status,
    policy_version: "launch-v1",
    effective_from: new Date("2026-05-20T00:00:00.000Z"),
    effective_until: effectiveUntil,
    operational_reason: "launch_posture",
    reviewer_principal_id: null,
    created_by_principal_id: PRINCIPAL_ID,
    created_at: new Date("2026-05-20T00:00:00.000Z"),
  };
}

function decision(
  id: string,
  jurisdictionCodes: readonly string[],
  createdAt: Date,
  subjectId = "match-001",
  correlationId = "corr-batch-001",
): GateDecisionRecord {
  return {
    gate_decision_id: id,
    subject_kind: "match_ticket",
    subject_id: subjectId,
    decision: "deny",
    reason_code: "disabled_jurisdiction",
    jurisdiction_codes: jurisdictionCodes,
    policy_version: "launch-v1",
    policy_revision_ids: ["policy-001"],
    correlation_id: correlationId,
    principal_id: PRINCIPAL_ID,
    audit_event_id: `audit-${id}`,
    created_at: createdAt,
  };
}
