export interface ParleyFunctionDefinition {
  readonly name:
    | "dispatcher"
    | "coordinator"
    | "side_runner_seeker"
    | "side_runner_employer"
    | "privacy_filter"
    | "dossier_producer"
    | "run_invalidator";
  readonly trigger_events: readonly string[];
  readonly emits_events: readonly string[];
  readonly concurrency_key: string;
  readonly idempotency_key: string;
  readonly retry_profile: "dispatch" | "coordinator" | "side_runner" | "filter" | "producer";
}

export const PARLEY_FUNCTIONS: readonly ParleyFunctionDefinition[] = [
  {
    name: "dispatcher",
    trigger_events: ["match_ticket.match_made", "match_ticket.renegotiation_requested"],
    emits_events: ["negotiation.dispatch.requested", "negotiation.run.terminated"],
    concurrency_key: "match_ticket_id",
    idempotency_key: "match_ticket_id:attempt:correlation_id",
    retry_profile: "dispatch",
  },
  {
    name: "coordinator",
    trigger_events: ["negotiation.dispatch.requested"],
    emits_events: [
      "negotiation.turn.requested",
      "negotiation.filter.requested",
      "negotiation.scoring.requested",
      "negotiation.dossier.requested",
    ],
    concurrency_key: "match_ticket_id",
    idempotency_key: "run_id:coordinator_step:round:side",
    retry_profile: "coordinator",
  },
  {
    name: "side_runner_seeker",
    trigger_events: ["negotiation.turn.requested", "negotiation.scoring.requested"],
    emits_events: ["negotiation.turn.completed", "negotiation.scoring.completed"],
    concurrency_key: "run_id:seeker",
    idempotency_key: "run_id:seeker:phase:round",
    retry_profile: "side_runner",
  },
  {
    name: "side_runner_employer",
    trigger_events: ["negotiation.turn.requested", "negotiation.scoring.requested"],
    emits_events: ["negotiation.turn.completed", "negotiation.scoring.completed"],
    concurrency_key: "run_id:employer",
    idempotency_key: "run_id:employer:phase:round",
    retry_profile: "side_runner",
  },
  {
    name: "privacy_filter",
    trigger_events: ["negotiation.filter.requested"],
    emits_events: ["negotiation.filter.completed"],
    concurrency_key: "run_id",
    idempotency_key: "run_id:filter:round:direction:source_ref",
    retry_profile: "filter",
  },
  {
    name: "dossier_producer",
    trigger_events: ["negotiation.dossier.requested"],
    emits_events: ["dossier.produced", "negotiation.run.terminated"],
    concurrency_key: "run_id",
    idempotency_key: "run_id:dossier",
    retry_profile: "producer",
  },
  {
    name: "run_invalidator",
    trigger_events: ["match_ticket.invalidating_state_change"],
    emits_events: ["negotiation.run.terminated"],
    concurrency_key: "match_ticket_id",
    idempotency_key: "match_ticket_id:invalidating_state_change:reason",
    retry_profile: "coordinator",
  },
];

export function assertNoPollingFunctions(
  definitions: readonly ParleyFunctionDefinition[] = PARLEY_FUNCTIONS,
): void {
  const offender = definitions.find((definition) =>
    definition.trigger_events.some((event) => event.includes("poll") || event.includes("tick")),
  );
  if (offender) throw new Error(`polling trigger not allowed: ${offender.name}`);
}
