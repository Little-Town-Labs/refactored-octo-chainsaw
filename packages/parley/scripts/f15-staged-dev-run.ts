import {
  InMemoryRenegotiationRepository,
  observeRenegotiationCost,
  processRenegotiationRequest,
  projectRenegotiationOutcome,
} from "../src/renegotiation.js";
import { InMemoryParleyRunRepository } from "../src/repo.js";
import { renegotiationMatchTicket, renegotiationRequest } from "../src/__tests__/fixtures.js";

const repository = new InMemoryRenegotiationRepository();
const runRepository = new InMemoryParleyRunRepository();

const accepted = await processRenegotiationRequest({
  request: renegotiationRequest(),
  matchTicket: renegotiationMatchTicket(),
  repository,
  runRepository,
  estimatedCost: 4,
});

const duplicate = await processRenegotiationRequest({
  request: renegotiationRequest(),
  matchTicket: renegotiationMatchTicket(),
  repository,
  runRepository,
  estimatedCost: 4,
});

const capRepository = new InMemoryRenegotiationRepository();
const cap = await processRenegotiationRequest({
  request: renegotiationRequest({
    request_id: "00000000-0000-7000-8000-0000000015c1",
    requested_attempt: 3,
  }),
  matchTicket: renegotiationMatchTicket({ current_attempt: 2, employer_round_cap: 2 }),
  repository: capRepository,
  runRepository: new InMemoryParleyRunRepository(),
  estimatedCost: 4,
});

const unauthorized = await processRenegotiationRequest({
  request: renegotiationRequest({
    request_id: "00000000-0000-7000-8000-0000000015c2",
    requester_scopes: [],
  }),
  matchTicket: renegotiationMatchTicket(),
  repository: new InMemoryRenegotiationRepository(),
  runRepository: new InMemoryParleyRunRepository(),
  estimatedCost: 4,
});

const costRepository = new InMemoryRenegotiationRepository();
const cost = await processRenegotiationRequest({
  request: renegotiationRequest({ request_id: "00000000-0000-7000-8000-0000000015c3" }),
  matchTicket: renegotiationMatchTicket({ cost_ceiling: 3 }),
  repository: costRepository,
  runRepository: new InMemoryParleyRunRepository(),
  estimatedCost: 4,
});

const runtimeRepository = new InMemoryRenegotiationRepository();
const runtimeAccepted = await processRenegotiationRequest({
  request: renegotiationRequest({ request_id: "00000000-0000-7000-8000-0000000015c4" }),
  matchTicket: renegotiationMatchTicket({ cost_ceiling: 5 }),
  repository: runtimeRepository,
  runRepository: new InMemoryParleyRunRepository(),
  estimatedCost: 4,
});
const runtime = await observeRenegotiationCost({
  attempt: runtimeAccepted.attempt_record!,
  repository: runtimeRepository,
  observedCost: 6,
});

const runs = await runRepository.listRuns();
const evidence = {
  accepted: {
    decision: accepted.decision,
    reason_code: accepted.reason_code,
    run_id_distinct_from_prior: accepted.run_id !== renegotiationRequest().prior_run_id,
    same_match_ticket: accepted.match_ticket_id === renegotiationMatchTicket().match_ticket_id,
    attempt: accepted.attempt,
    isolation: accepted.attempt_record?.isolation_boundary,
    projection: projectRenegotiationOutcome(accepted),
  },
  duplicate: {
    decision: duplicate.decision,
    reason_code: duplicate.reason_code,
    run_count: runs.length,
  },
  refusals: {
    cap: cap.reason_code,
    unauthorized: unauthorized.reason_code,
    cost: cost.reason_code,
  },
  runtime_cost: {
    status: runtime.attempt.status,
    terminal_reason: runtime.attempt.terminal_reason,
    alarm_type: runtime.alarm?.alarm_type,
  },
};

console.log(JSON.stringify(evidence, null, 2));
