import {
  counterpartyAccessFindings,
  type CounterpartyAccessFindingRow,
  type Db,
  type NewCounterpartyAccessFindingRow,
  type NewPrivacyFilterDecisionRow,
  type NewPrivacyRulesetVersionRow,
  type NewSentinelFailureRow,
  privacyFilterDecisions,
  type PrivacyFilterDecisionRow,
  privacyRulesetVersions,
  type PrivacyRulesetVersionRow,
  sentinelFailures,
  type SentinelFailureRow,
} from "@spyglass/db";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import type {
  CounterpartyAccessFinding,
  FilterDecision,
  NewCounterpartyAccessFinding,
  NewFilterDecision,
  NewPrivacyRulesetVersion,
  NewSentinelFailure,
  PrivacyRulesetRef,
  PrivacyRulesetVersion,
  SentinelFailure,
} from "./types.js";

export interface PrivacyRepository {
  getRuleset(ref: PrivacyRulesetRef): Promise<PrivacyRulesetVersion | null>;
  insertRuleset(input: NewPrivacyRulesetVersion): Promise<PrivacyRulesetVersion>;
  updateRulesetDeprecated(input: {
    readonly privacyRulesetVersionId: string;
    readonly deprecatedAt: Date;
  }): Promise<PrivacyRulesetVersion>;
  appendFilterDecision(input: NewFilterDecision): Promise<FilterDecision>;
  appendSentinelFailure(input: NewSentinelFailure): Promise<SentinelFailure>;
  appendAccessFinding(input: NewCounterpartyAccessFinding): Promise<CounterpartyAccessFinding>;
  listRulesets(query?: {
    readonly rulesetId?: string;
    readonly limit?: number;
  }): Promise<readonly PrivacyRulesetVersion[]>;
  listFilterDecisions(runId?: string): Promise<readonly FilterDecision[]>;
  listSentinelFailures(runId?: string): Promise<readonly SentinelFailure[]>;
  listAccessFindings(): Promise<readonly CounterpartyAccessFinding[]>;
}

export function createDrizzlePrivacyRepository(db: Db): PrivacyRepository {
  return {
    async getRuleset(ref) {
      const rows = await db
        .select()
        .from(privacyRulesetVersions)
        .where(
          and(
            eq(privacyRulesetVersions.ruleset_id, ref.ruleset_id),
            eq(privacyRulesetVersions.version, ref.version),
          ),
        )
        .limit(1);
      return rows[0] ? toRuleset(rows[0]) : null;
    },
    async insertRuleset(input) {
      const [row] = await db
        .insert(privacyRulesetVersions)
        .values(toRulesetInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert privacy ruleset");
      return toRuleset(row);
    },
    async updateRulesetDeprecated(input) {
      const [row] = await db
        .update(privacyRulesetVersions)
        .set({ status: "deprecated", deprecated_at: input.deprecatedAt })
        .where(eq(privacyRulesetVersions.privacy_ruleset_version_id, input.privacyRulesetVersionId))
        .returning();
      if (!row) throw new Error("failed to deprecate privacy ruleset");
      return toRuleset(row);
    },
    async appendFilterDecision(input) {
      const [row] = await db
        .insert(privacyFilterDecisions)
        .values(toDecisionInsert(input))
        .returning();
      if (!row) throw new Error("failed to append privacy filter decision");
      return toDecision(row);
    },
    async appendSentinelFailure(input) {
      const [row] = await db.insert(sentinelFailures).values(toSentinelInsert(input)).returning();
      if (!row) throw new Error("failed to append sentinel failure");
      return toSentinelFailure(row);
    },
    async appendAccessFinding(input) {
      const [row] = await db
        .insert(counterpartyAccessFindings)
        .values(toAccessFindingInsert(input))
        .returning();
      if (!row) throw new Error("failed to append counterparty access finding");
      return toAccessFinding(row);
    },
    async listRulesets(query = {}) {
      const rows = await db
        .select()
        .from(privacyRulesetVersions)
        .where(query.rulesetId ? eq(privacyRulesetVersions.ruleset_id, query.rulesetId) : undefined)
        .orderBy(desc(privacyRulesetVersions.created_at))
        .limit(query.limit ?? 50);
      return rows.map(toRuleset);
    },
    async listFilterDecisions(runId) {
      const rows = await db
        .select()
        .from(privacyFilterDecisions)
        .where(runId ? eq(privacyFilterDecisions.run_id, runId) : undefined)
        .orderBy(desc(privacyFilterDecisions.created_at));
      return rows.map(toDecision);
    },
    async listSentinelFailures(runId) {
      const rows = await db
        .select()
        .from(sentinelFailures)
        .where(runId ? eq(sentinelFailures.run_id, runId) : undefined)
        .orderBy(desc(sentinelFailures.created_at));
      return rows.map(toSentinelFailure);
    },
    async listAccessFindings() {
      const rows = await db
        .select()
        .from(counterpartyAccessFindings)
        .orderBy(desc(counterpartyAccessFindings.created_at));
      return rows.map(toAccessFinding);
    },
  };
}

export class InMemoryPrivacyRepository implements PrivacyRepository {
  readonly rulesets = new Map<string, PrivacyRulesetVersion>();
  readonly decisions: FilterDecision[] = [];
  readonly failures: SentinelFailure[] = [];
  readonly findings: CounterpartyAccessFinding[] = [];

  async getRuleset(ref: PrivacyRulesetRef): Promise<PrivacyRulesetVersion | null> {
    return this.rulesets.get(`${ref.ruleset_id}@${ref.version}`) ?? null;
  }

  async insertRuleset(input: NewPrivacyRulesetVersion): Promise<PrivacyRulesetVersion> {
    const key = `${input.ruleset_id}@${input.version}`;
    if (this.rulesets.has(key)) throw new Error(`privacy ruleset already exists: ${key}`);
    const row: PrivacyRulesetVersion = {
      ...input,
      privacy_ruleset_version_id: input.privacy_ruleset_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.rulesets.set(key, row);
    return row;
  }

  async updateRulesetDeprecated(input: {
    readonly privacyRulesetVersionId: string;
    readonly deprecatedAt: Date;
  }): Promise<PrivacyRulesetVersion> {
    for (const [key, ruleset] of this.rulesets.entries()) {
      if (ruleset.privacy_ruleset_version_id === input.privacyRulesetVersionId) {
        const deprecated = {
          ...ruleset,
          status: "deprecated" as const,
          deprecated_at: input.deprecatedAt,
        };
        this.rulesets.set(key, deprecated);
        return deprecated;
      }
    }
    throw new Error("privacy ruleset not found");
  }

  async appendFilterDecision(input: NewFilterDecision): Promise<FilterDecision> {
    const decision = {
      ...input,
      filter_decision_id: input.filter_decision_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.decisions.push(decision);
    return decision;
  }

  async appendSentinelFailure(input: NewSentinelFailure): Promise<SentinelFailure> {
    const failure = {
      ...input,
      sentinel_failure_id: input.sentinel_failure_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.failures.push(failure);
    return failure;
  }

  async appendAccessFinding(
    input: NewCounterpartyAccessFinding,
  ): Promise<CounterpartyAccessFinding> {
    const finding = {
      ...input,
      finding_id: input.finding_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.findings.push(finding);
    return finding;
  }

  async listRulesets(query: { readonly rulesetId?: string; readonly limit?: number } = {}) {
    return [...this.rulesets.values()]
      .filter((ruleset) => !query.rulesetId || ruleset.ruleset_id === query.rulesetId)
      .slice(0, query.limit ?? 50);
  }

  async listFilterDecisions(runId?: string) {
    return this.decisions.filter((decision) => !runId || decision.run_id === runId);
  }

  async listSentinelFailures(runId?: string) {
    return this.failures.filter((failure) => !runId || failure.run_id === runId);
  }

  async listAccessFindings() {
    return this.findings;
  }
}

function toRuleset(row: PrivacyRulesetVersionRow): PrivacyRulesetVersion {
  return row as PrivacyRulesetVersion;
}

function toDecision(row: PrivacyFilterDecisionRow): FilterDecision {
  return row as FilterDecision;
}

function toSentinelFailure(row: SentinelFailureRow): SentinelFailure {
  return row as SentinelFailure;
}

function toAccessFinding(row: CounterpartyAccessFindingRow): CounterpartyAccessFinding {
  return row as CounterpartyAccessFinding;
}

function toRulesetInsert(input: NewPrivacyRulesetVersion): NewPrivacyRulesetVersionRow {
  return input as NewPrivacyRulesetVersionRow;
}

function toDecisionInsert(input: NewFilterDecision): NewPrivacyFilterDecisionRow {
  return input as NewPrivacyFilterDecisionRow;
}

function toSentinelInsert(input: NewSentinelFailure): NewSentinelFailureRow {
  return input as NewSentinelFailureRow;
}

function toAccessFindingInsert(
  input: NewCounterpartyAccessFinding,
): NewCounterpartyAccessFindingRow {
  return input as NewCounterpartyAccessFindingRow;
}
