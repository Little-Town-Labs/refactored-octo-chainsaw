import { randomUUID } from "node:crypto";

import type {
  ParleyRun,
  ParleyRunState,
  ParleyTerminalState,
  ParleyTransitionEvent,
} from "./types.js";

export interface ClaimRunInput {
  readonly run_id?: string;
  readonly match_ticket_id: string;
  readonly match_ticket_identifier: string;
  readonly attempt: number;
  readonly round_cap: number;
  readonly seeker_contract_ref: ParleyRun["seeker_contract_ref"];
  readonly employer_contract_ref: ParleyRun["employer_contract_ref"];
  readonly privacy_ruleset_ref: ParleyRun["privacy_ruleset_ref"];
  readonly harness_version: string;
  readonly now?: Date;
}

export interface TransitionRunInput {
  readonly run_id: string;
  readonly from_state: ParleyRunState;
  readonly to_state: ParleyRunState;
  readonly reason_code: string;
  readonly side?: "seeker" | "employer" | null;
  readonly round?: number;
  readonly audit_event_id?: string | null;
  readonly dossier_id?: string | null;
  readonly now?: Date;
}

export interface ParleyRunRepository {
  claimRun(input: ClaimRunInput): Promise<ParleyRun>;
  getRun(runId: string): Promise<ParleyRun | null>;
  getActiveRunForMatch(matchTicketId: string): Promise<ParleyRun | null>;
  transitionRun(input: TransitionRunInput): Promise<ParleyRun>;
  listTransitions(runId: string): Promise<readonly ParleyTransitionEvent[]>;
  listRuns(): Promise<readonly ParleyRun[]>;
}

export class InMemoryParleyRunRepository implements ParleyRunRepository {
  readonly runs = new Map<string, ParleyRun>();
  readonly transitions: ParleyTransitionEvent[] = [];

  async claimRun(input: ClaimRunInput): Promise<ParleyRun> {
    const active = await this.getActiveRunForMatch(input.match_ticket_id);
    if (active) {
      if (input.run_id && active.run_id === input.run_id) return active;
      throw new Error("match_ticket_concurrent_run_claimed");
    }
    const now = input.now ?? new Date();
    const run: ParleyRun = {
      run_id: input.run_id ?? randomUUID(),
      match_ticket_id: input.match_ticket_id,
      match_ticket_identifier: input.match_ticket_identifier,
      attempt: input.attempt,
      status: "pending",
      round: 0,
      round_cap: input.round_cap,
      seeker_contract_ref: input.seeker_contract_ref,
      employer_contract_ref: input.employer_contract_ref,
      privacy_ruleset_ref: input.privacy_ruleset_ref,
      harness_version: input.harness_version,
      terminal_reason: null,
      dossier_id: null,
      started_at: now,
      completed_at: null,
    };
    this.runs.set(run.run_id, run);
    return run;
  }

  async getRun(runId: string): Promise<ParleyRun | null> {
    return this.runs.get(runId) ?? null;
  }

  async getActiveRunForMatch(matchTicketId: string): Promise<ParleyRun | null> {
    return (
      [...this.runs.values()].find(
        (run) => run.match_ticket_id === matchTicketId && !isTerminalState(run.status),
      ) ?? null
    );
  }

  async transitionRun(input: TransitionRunInput): Promise<ParleyRun> {
    const current = this.runs.get(input.run_id);
    if (!current) throw new Error("parley_run_missing");
    if (current.status !== input.from_state) {
      throw new Error(`parley_transition_conflict:${current.status}:${input.from_state}`);
    }
    const now = input.now ?? new Date();
    const next: ParleyRun = {
      ...current,
      status: input.to_state,
      round: input.round ?? current.round,
      terminal_reason: isTerminalState(input.to_state)
        ? input.reason_code
        : current.terminal_reason,
      dossier_id: input.dossier_id === undefined ? current.dossier_id : input.dossier_id,
      completed_at: isTerminalState(input.to_state) ? now : current.completed_at,
    };
    const transition: ParleyTransitionEvent = {
      transition_id: transitionId(input),
      run_id: input.run_id,
      match_ticket_id: current.match_ticket_id,
      round: input.round ?? current.round,
      side: input.side ?? null,
      from_state: input.from_state,
      to_state: input.to_state,
      reason_code: input.reason_code,
      audit_event_id: input.audit_event_id ?? null,
      created_at: now,
    };
    if (!this.transitions.some((existing) => existing.transition_id === transition.transition_id)) {
      this.transitions.push(transition);
    }
    this.runs.set(next.run_id, next);
    return next;
  }

  async listTransitions(runId: string): Promise<readonly ParleyTransitionEvent[]> {
    return this.transitions.filter((transition) => transition.run_id === runId);
  }

  async listRuns(): Promise<readonly ParleyRun[]> {
    return [...this.runs.values()];
  }
}

export function isTerminalState(state: ParleyRunState): state is ParleyTerminalState {
  return (
    state === "complete" ||
    state === "inconclusive" ||
    state === "aborted" ||
    state === "timed_out" ||
    state === "tool_failure" ||
    state === "dispatch_refused"
  );
}

function transitionId(input: TransitionRunInput): string {
  return [
    input.run_id,
    input.round ?? "current",
    input.side ?? "none",
    input.from_state,
    input.to_state,
    input.reason_code,
  ].join(":");
}
