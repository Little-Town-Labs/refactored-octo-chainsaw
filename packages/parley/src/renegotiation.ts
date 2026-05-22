import { DEFAULT_ROUND_CAP } from "./config.js";
import type { ParleyRunRepository } from "./repo.js";
import type {
  ParleyConfig,
  RenegotiationAlarm,
  RenegotiationAlarmType,
  RenegotiationAttempt,
  RenegotiationAuditEvent,
  RenegotiationDecision,
  RenegotiationIsolationBoundary,
  RenegotiationMatchTicketSnapshot,
  RenegotiationOutcomeProjection,
  RenegotiationReasonCode,
  RenegotiationRequest,
} from "./types.js";
import { RENEGOTIATION_EVENT_NAME } from "./types.js";

export const F15_DEFAULT_PLATFORM_ROUND_CAP = DEFAULT_ROUND_CAP;

export interface RenegotiationRepository {
  getDecision(requestId: string): Promise<RenegotiationDecision | null>;
  saveDecision(decision: RenegotiationDecision): Promise<void>;
  getAttempt(matchTicketId: string, attempt: number): Promise<RenegotiationAttempt | null>;
  saveAttempt(attempt: RenegotiationAttempt): Promise<void>;
  updateAttempt(attempt: RenegotiationAttempt): Promise<void>;
  appendAuditEvent(event: RenegotiationAuditEvent): Promise<void>;
  appendAlarm(alarm: RenegotiationAlarm): Promise<void>;
  listAuditEvents(): Promise<readonly RenegotiationAuditEvent[]>;
  listAlarms(): Promise<readonly RenegotiationAlarm[]>;
  listAttempts(): Promise<readonly RenegotiationAttempt[]>;
}

export interface ProcessRenegotiationOptions {
  readonly request: RenegotiationRequest;
  readonly matchTicket: RenegotiationMatchTicketSnapshot | null;
  readonly repository: RenegotiationRepository;
  readonly runRepository: ParleyRunRepository;
  readonly estimatedCost: number;
  readonly config?: Partial<ParleyConfig>;
  readonly now?: Date;
}

export interface ObserveRenegotiationCostOptions {
  readonly attempt: RenegotiationAttempt;
  readonly repository: RenegotiationRepository;
  readonly observedCost: number;
  readonly now?: Date;
}

export class InMemoryRenegotiationRepository implements RenegotiationRepository {
  readonly decisions = new Map<string, RenegotiationDecision>();
  readonly attempts = new Map<string, RenegotiationAttempt>();
  readonly auditEvents: RenegotiationAuditEvent[] = [];
  readonly alarms: RenegotiationAlarm[] = [];

  async getDecision(requestId: string): Promise<RenegotiationDecision | null> {
    return this.decisions.get(requestId) ?? null;
  }

  async saveDecision(decision: RenegotiationDecision): Promise<void> {
    this.decisions.set(decision.request_id, decision);
  }

  async getAttempt(matchTicketId: string, attempt: number): Promise<RenegotiationAttempt | null> {
    return this.attempts.get(attemptKey(matchTicketId, attempt)) ?? null;
  }

  async saveAttempt(attempt: RenegotiationAttempt): Promise<void> {
    this.attempts.set(attemptKey(attempt.match_ticket_id, attempt.attempt), attempt);
  }

  async updateAttempt(attempt: RenegotiationAttempt): Promise<void> {
    this.attempts.set(attemptKey(attempt.match_ticket_id, attempt.attempt), attempt);
  }

  async appendAuditEvent(event: RenegotiationAuditEvent): Promise<void> {
    if (!this.auditEvents.some((existing) => existing.audit_event_id === event.audit_event_id)) {
      this.auditEvents.push(event);
    }
  }

  async appendAlarm(alarm: RenegotiationAlarm): Promise<void> {
    if (!this.alarms.some((existing) => existing.alarm_id === alarm.alarm_id)) {
      this.alarms.push(alarm);
    }
  }

  async listAuditEvents(): Promise<readonly RenegotiationAuditEvent[]> {
    return [...this.auditEvents];
  }

  async listAlarms(): Promise<readonly RenegotiationAlarm[]> {
    return [...this.alarms];
  }

  async listAttempts(): Promise<readonly RenegotiationAttempt[]> {
    return [...this.attempts.values()];
  }
}

export async function processRenegotiationRequest(
  options: ProcessRenegotiationOptions,
): Promise<RenegotiationDecision> {
  const replay = await options.repository.getDecision(options.request.request_id);
  if (replay) {
    const replayDecision: RenegotiationDecision = {
      ...replay,
      decision: "idempotent_replay",
      reason_code: "duplicate_request",
    };
    await options.repository.appendAuditEvent(
      auditEvent("renegotiation.request.replayed", replayDecision, replayDecision.reason_code),
    );
    return replayDecision;
  }

  const now = options.now ?? new Date();
  const matchTicket = options.matchTicket;
  const effectiveCap = matchTicket
    ? effectiveRenegotiationRoundCap(matchTicket, options.config)
    : 1;
  const costCeiling = matchTicket?.cost_ceiling ?? 0;
  const base = {
    request: options.request,
    effectiveCap,
    costCeiling,
    estimatedCost: options.estimatedCost,
    now,
  };

  const missing = missingReferenceReason(options.request, matchTicket);
  if (missing) return deny({ ...base, repository: options.repository, reason: missing });

  if (!matchTicket) {
    return deny({ ...base, repository: options.repository, reason: "match_ticket_not_found" });
  }
  if (
    options.request.event_name !== RENEGOTIATION_EVENT_NAME ||
    options.request.event_version !== 1
  ) {
    return deny({ ...base, repository: options.repository, reason: "missing_required_reference" });
  }
  if (matchTicket.status === "closed" || matchTicket.status === "withdrawn") {
    return deny({ ...base, repository: options.repository, reason: "match_ticket_not_eligible" });
  }
  if (matchTicket.legal_hold) {
    return deny({
      ...base,
      repository: options.repository,
      reason: "legal_hold_blocks_processing",
    });
  }
  if (matchTicket.tombstoned) {
    return deny({ ...base, repository: options.repository, reason: "tombstone_blocks_processing" });
  }
  if (
    !matchTicket.authorized_sides.includes(options.request.requester_side) ||
    !options.request.requester_scopes.includes("match_ticket:renegotiate")
  ) {
    return deny({ ...base, repository: options.repository, reason: "unauthorized_requester" });
  }
  if (!isRequesterClearedSide(matchTicket, options.request.requester_side)) {
    const reason = isAsymmetric(matchTicket.prior_outcome)
      ? "requester_not_cleared_side"
      : "prior_outcome_not_asymmetric";
    return deny({ ...base, repository: options.repository, reason });
  }
  if (
    matchTicket.current_attempt >= effectiveCap ||
    options.request.requested_attempt > effectiveCap
  ) {
    return denyWithAlarm({
      ...base,
      repository: options.repository,
      reason: "round_cap_exhausted",
      alarmType: "round_cap_exhausted",
      threshold: effectiveCap,
      observed: Math.max(matchTicket.current_attempt, options.request.requested_attempt),
      severity: "warning",
    });
  }
  if (options.estimatedCost > matchTicket.cost_ceiling) {
    return denyWithAlarm({
      ...base,
      repository: options.repository,
      reason: "cost_ceiling_exceeded",
      alarmType: "cost_ceiling_exceeded",
      threshold: matchTicket.cost_ceiling,
      observed: options.estimatedCost,
      severity: "high",
    });
  }

  const active = await options.runRepository.getActiveRunForMatch(matchTicket.match_ticket_id);
  if (active) {
    return denyWithAlarm({
      ...base,
      repository: options.repository,
      reason: "active_run_exists",
      alarmType: "duplicate_run_allocation_attempt",
      threshold: 1,
      observed: 1,
      severity: "high",
    });
  }

  const existingAttempt = await options.repository.getAttempt(
    matchTicket.match_ticket_id,
    options.request.requested_attempt,
  );
  if (existingAttempt) {
    return denyWithAlarm({
      ...base,
      repository: options.repository,
      reason: "active_run_exists",
      alarmType: "duplicate_run_allocation_attempt",
      threshold: 1,
      observed: 1,
      severity: "high",
    });
  }

  const run = await options.runRepository.claimRun({
    run_id: options.request.request_id,
    match_ticket_id: matchTicket.match_ticket_id,
    match_ticket_identifier: matchTicket.match_ticket_identifier,
    attempt: options.request.requested_attempt,
    round_cap: effectiveCap,
    seeker_contract_ref: matchTicket.seeker_contract_ref,
    employer_contract_ref: matchTicket.employer_contract_ref,
    privacy_ruleset_ref: matchTicket.privacy_ruleset_ref,
    harness_version: options.config?.harness_version ?? "f15.0.0",
    now,
  });
  const attempt: RenegotiationAttempt = {
    attempt_id: `${matchTicket.match_ticket_id}:${options.request.requested_attempt}`,
    match_ticket_id: matchTicket.match_ticket_id,
    attempt: options.request.requested_attempt,
    run_id: run.run_id,
    request_id: options.request.request_id,
    requester_side: options.request.requester_side,
    status: "accepted",
    effective_round_cap: effectiveCap,
    cost_ceiling: matchTicket.cost_ceiling,
    cost_observed: 0,
    prior_run_id: options.request.prior_run_id,
    prior_dossier_id: options.request.prior_dossier_id ?? null,
    isolation_boundary: freshIsolationBoundary(),
    created_at: now,
    started_at: now,
    completed_at: null,
    terminal_reason: null,
  };
  await options.repository.saveAttempt(attempt);

  const decision = decisionFor({
    request: options.request,
    decision: "allow",
    reason: "renegotiation_allowed",
    effectiveCap,
    costCeiling: matchTicket.cost_ceiling,
    estimatedCost: options.estimatedCost,
    runId: run.run_id,
    now,
    attempt,
    alarms: [],
  });
  await options.repository.appendAuditEvent(auditEvent("renegotiation.request.accepted", decision));
  await options.repository.appendAuditEvent(auditEvent("renegotiation.run.allocated", decision));
  await options.repository.saveDecision(decision);
  return decision;
}

export async function observeRenegotiationCost(
  options: ObserveRenegotiationCostOptions,
): Promise<{ readonly attempt: RenegotiationAttempt; readonly alarm: RenegotiationAlarm | null }> {
  const now = options.now ?? new Date();
  if (options.observedCost <= options.attempt.cost_ceiling) {
    const updated = { ...options.attempt, cost_observed: options.observedCost };
    await options.repository.updateAttempt(updated);
    return { attempt: updated, alarm: null };
  }
  const auditRef = auditId(
    "renegotiation.run.terminated",
    options.attempt.request_id,
    "cost_ceiling_exceeded",
  );
  const alarm = alarmFor({
    alarmType: "cost_ceiling_exceeded",
    matchTicketId: options.attempt.match_ticket_id,
    attempt: options.attempt.attempt,
    runId: options.attempt.run_id,
    threshold: options.attempt.cost_ceiling,
    observed: options.observedCost,
    severity: "critical",
    auditEventRef: auditRef,
    now,
  });
  const updated: RenegotiationAttempt = {
    ...options.attempt,
    status: "terminated",
    cost_observed: options.observedCost,
    completed_at: now,
    terminal_reason: "cost_ceiling_exceeded",
  };
  await options.repository.updateAttempt(updated);
  await options.repository.appendAlarm(alarm);
  await options.repository.appendAuditEvent({
    audit_event_id: auditRef,
    event_name: "renegotiation.run.terminated",
    match_ticket_id: options.attempt.match_ticket_id,
    request_id: options.attempt.request_id,
    run_id: options.attempt.run_id,
    reason_code: "cost_ceiling_exceeded",
    created_at: now,
  });
  await options.repository.appendAuditEvent({
    audit_event_id: alarm.audit_event_ref,
    event_name: "renegotiation.cost.alarm",
    match_ticket_id: options.attempt.match_ticket_id,
    request_id: options.attempt.request_id,
    run_id: options.attempt.run_id,
    reason_code: "cost_ceiling_exceeded",
    created_at: now,
  });
  return { attempt: updated, alarm };
}

export function effectiveRenegotiationRoundCap(
  matchTicket: Pick<RenegotiationMatchTicketSnapshot, "seeker_round_cap" | "employer_round_cap">,
  config: Partial<ParleyConfig> = {},
): number {
  const candidates = [
    config.default_round_cap ?? F15_DEFAULT_PLATFORM_ROUND_CAP,
    matchTicket.seeker_round_cap,
    matchTicket.employer_round_cap,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const cap = Math.min(...candidates);
  if (cap < 1) throw new Error("renegotiation round cap must be at least 1");
  return Math.floor(cap);
}

export function freshIsolationBoundary(): RenegotiationIsolationBoundary {
  return {
    prompt_history_entries: 0,
    tool_call_entries: 0,
    seeker_scratch_entries: 0,
    employer_scratch_entries: 0,
    prior_context_rehydrated: false,
    allowed_reference_types: [
      "match_ticket_fact",
      "prior_run_id",
      "prior_dossier_id",
      "contract_ref",
      "rubric_ref",
      "prompt_ref",
      "model_ref",
      "runtime_ref",
    ],
  };
}

export function projectRenegotiationOutcome(
  decision: RenegotiationDecision,
): RenegotiationOutcomeProjection {
  return {
    match_ticket_id: decision.match_ticket_id,
    attempt: decision.attempt,
    decision: decision.decision,
    reason_code: decision.reason_code,
    run_id: decision.run_id,
    hidden_run_state_exposed: false,
    non_cleared_side_notified: decision.notification_policy.non_cleared_side_notified,
  };
}

function isRequesterClearedSide(
  matchTicket: RenegotiationMatchTicketSnapshot,
  side: "seeker" | "employer",
): boolean {
  return matchTicket.prior_outcome === `${side}_cleared`;
}

function isAsymmetric(outcome: RenegotiationMatchTicketSnapshot["prior_outcome"]): boolean {
  return outcome === "seeker_cleared" || outcome === "employer_cleared";
}

function missingReferenceReason(
  request: RenegotiationRequest,
  matchTicket: RenegotiationMatchTicketSnapshot | null,
): RenegotiationReasonCode | null {
  if (!request.request_id || !request.prior_run_id || !request.match_ticket_id) {
    return "missing_required_reference";
  }
  if (!matchTicket) return null;
  if (request.match_ticket_id !== matchTicket.match_ticket_id) return "match_ticket_not_found";
  if (request.match_ticket_identifier !== matchTicket.match_ticket_identifier) {
    return "missing_required_reference";
  }
  if (!matchTicket.prior_run_ids.includes(request.prior_run_id)) {
    return "missing_required_reference";
  }
  return null;
}

async function deny(input: {
  readonly repository: RenegotiationRepository;
  readonly request: RenegotiationRequest;
  readonly reason: RenegotiationReasonCode;
  readonly effectiveCap: number;
  readonly costCeiling: number;
  readonly estimatedCost: number;
  readonly now: Date;
}): Promise<RenegotiationDecision> {
  const decision = decisionFor({
    request: input.request,
    decision: "deny",
    reason: input.reason,
    effectiveCap: input.effectiveCap,
    costCeiling: input.costCeiling,
    estimatedCost: input.estimatedCost,
    runId: null,
    now: input.now,
    alarms: [],
  });
  await input.repository.appendAuditEvent(auditEvent("renegotiation.request.refused", decision));
  await input.repository.saveDecision(decision);
  return decision;
}

async function denyWithAlarm(input: {
  readonly repository: RenegotiationRepository;
  readonly request: RenegotiationRequest;
  readonly reason: RenegotiationReasonCode;
  readonly effectiveCap: number;
  readonly costCeiling: number;
  readonly estimatedCost: number;
  readonly now: Date;
  readonly alarmType: RenegotiationAlarmType;
  readonly threshold: number;
  readonly observed: number;
  readonly severity: "warning" | "high" | "critical";
}): Promise<RenegotiationDecision> {
  const auditRef = auditId("renegotiation.cost.alarm", input.request.request_id, input.reason);
  const alarm = alarmFor({
    alarmType: input.alarmType,
    matchTicketId: input.request.match_ticket_id,
    attempt: input.request.requested_attempt,
    runId: null,
    threshold: input.threshold,
    observed: input.observed,
    severity: input.severity,
    auditEventRef: auditRef,
    now: input.now,
  });
  const decision = decisionFor({
    request: input.request,
    decision: "deny",
    reason: input.reason,
    effectiveCap: input.effectiveCap,
    costCeiling: input.costCeiling,
    estimatedCost: input.estimatedCost,
    runId: null,
    now: input.now,
    alarms: [alarm],
  });
  await input.repository.appendAlarm(alarm);
  await input.repository.appendAuditEvent(auditEvent("renegotiation.cost.alarm", decision));
  await input.repository.appendAuditEvent(auditEvent("renegotiation.request.refused", decision));
  await input.repository.saveDecision(decision);
  return decision;
}

function decisionFor(input: {
  readonly request: RenegotiationRequest;
  readonly decision: "allow" | "deny";
  readonly reason: RenegotiationReasonCode;
  readonly effectiveCap: number;
  readonly costCeiling: number;
  readonly estimatedCost: number;
  readonly runId: string | null;
  readonly now: Date;
  readonly attempt?: RenegotiationAttempt;
  readonly alarms: readonly RenegotiationAlarm[];
}): RenegotiationDecision {
  const auditRef = auditId(
    input.decision === "allow" ? "renegotiation.request.accepted" : "renegotiation.request.refused",
    input.request.request_id,
    input.reason,
  );
  return {
    decision_id: `${input.request.request_id}:${input.reason}`,
    request_id: input.request.request_id,
    decision: input.decision,
    reason_code: input.reason,
    match_ticket_id: input.request.match_ticket_id,
    attempt: input.request.requested_attempt,
    run_id: input.runId,
    effective_round_cap: input.effectiveCap,
    cost_ceiling: input.costCeiling,
    estimated_cost: input.estimatedCost,
    audit_event_ref: auditRef,
    notification_policy: { non_cleared_side_notified: false },
    decided_at: input.now,
    ...(input.attempt ? { attempt_record: input.attempt } : {}),
    alarms: input.alarms,
  };
}

function auditEvent(
  eventName: RenegotiationAuditEvent["event_name"],
  decision: RenegotiationDecision,
  reasonCode: RenegotiationReasonCode = decision.reason_code,
): RenegotiationAuditEvent {
  return {
    audit_event_id: auditId(eventName, decision.request_id, reasonCode),
    event_name: eventName,
    match_ticket_id: decision.match_ticket_id,
    request_id: decision.request_id,
    run_id: decision.run_id,
    reason_code: reasonCode,
    created_at: decision.decided_at,
  };
}

function alarmFor(input: {
  readonly alarmType: RenegotiationAlarmType;
  readonly matchTicketId: string;
  readonly attempt: number;
  readonly runId: string | null;
  readonly threshold: number;
  readonly observed: number;
  readonly severity: "warning" | "high" | "critical";
  readonly auditEventRef: string;
  readonly now: Date;
}): RenegotiationAlarm {
  return {
    alarm_id: `${input.matchTicketId}:${input.attempt}:${input.alarmType}`,
    alarm_type: input.alarmType,
    severity: input.severity,
    match_ticket_id: input.matchTicketId,
    attempt: input.attempt,
    run_id: input.runId,
    threshold: input.threshold,
    observed: input.observed,
    audit_event_ref: input.auditEventRef,
    raised_at: input.now,
  };
}

function auditId(
  eventName: RenegotiationAuditEvent["event_name"],
  requestId: string,
  reasonCode: RenegotiationReasonCode,
): string {
  return `${eventName}:${requestId}:${reasonCode}`;
}

function attemptKey(matchTicketId: string, attempt: number): string {
  return `${matchTicketId}:${attempt}`;
}
