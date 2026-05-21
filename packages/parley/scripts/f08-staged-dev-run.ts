import assert from "node:assert/strict";

import {
  InMemoryDossierRepository,
  createTestDossierSigningKey,
  verifyDossier,
} from "@spyglass/dossiers";

import {
  DeterministicSideAgentDriver,
  InMemoryParleyRunRepository,
  NegotiationContextManager,
  coordinateParleyRun,
} from "../src/index.js";
import { testRubric } from "../src/__tests__/fixtures.js";

const runRepository = new InMemoryParleyRunRepository();
const dossierRepository = new InMemoryDossierRepository();
const key = createTestDossierSigningKey("f08-staged");

const run = await runRepository.claimRun({
  run_id: "00000000-0000-7000-8000-000000000850",
  match_ticket_id: "00000000-0000-7000-8000-000000000851",
  match_ticket_identifier: "MT-2026-00850",
  attempt: 1,
  round_cap: 2,
  seeker_contract_ref: { contract_id: "seeker.contract", version: "1.0.0" },
  employer_contract_ref: { contract_id: "employer.contract", version: "1.0.0" },
  privacy_ruleset_ref: { ruleset_id: "standard", version: "1.0.0" },
  harness_version: "f08.0.0",
});

const result = await coordinateParleyRun({
  run,
  runRepository,
  contextManager: new NegotiationContextManager(),
  dossierRepository,
  signingKey: key,
  seeker_rubric: testRubric({ rubric_id: "seeker.standard", side: "seeker" }),
  employer_rubric: testRubric({ rubric_id: "employer.standard", side: "employer" }),
  sideAgentDriver: new DeterministicSideAgentDriver(
    {
      seeker: [
        {
          message_to_counterparty: "Seeker has high interest and availability.",
          internal_notes: "Seeker fit looks strong.",
          done_signal: true,
          flag_proposals: [],
          model_invocation_ref: "fixture:seeker:turn:1",
        },
      ],
      employer: [
        {
          message_to_counterparty: "Employer confirms role alignment.",
          internal_notes: "Employer fit looks strong.",
          done_signal: true,
          flag_proposals: [],
          model_invocation_ref: "fixture:employer:turn:1",
        },
      ],
    },
    {
      seeker: {
        dimension_scores: [
          { dimension_id: "fit", score: 9, rationale: "High role alignment." },
          { dimension_id: "timing", score: 8, rationale: "Ready soon." },
        ],
        headline_rationale: "Seeker and role are strongly aligned.",
        flag_proposals: [],
        model_invocation_ref: "fixture:seeker:score",
      },
      employer: {
        dimension_scores: [
          { dimension_id: "fit", score: 8, rationale: "Strong candidate profile." },
          { dimension_id: "timing", score: 8, rationale: "Hiring timeline aligns." },
        ],
        headline_rationale: "Employer sees a strong fit.",
        flag_proposals: [],
        model_invocation_ref: "fixture:employer:score",
      },
    },
  ),
});

const verification = await verifyDossier({
  repository: dossierRepository,
  dossier: result.dossier,
  keys: { resolve: () => key.publicKey },
});

assert.equal(result.terminal_event.terminal_state, "complete");
assert.equal(result.dossier.status, "conclusive");
assert.equal(Object.keys(result.dossier.projection_refs).length, 4);
assert.equal(verification.decision, "valid");

console.log(`run_status=${result.terminal_event.terminal_state}`);
console.log(`round_cap=${run.round_cap}`);
console.log(`dossier_status=${result.dossier.status}`);
console.log(`signature_verification=${verification.decision}`);
console.log(`projection_count=${Object.keys(result.dossier.projection_refs).length}`);
console.log(`terminal_event=${result.terminal_event.event_name}`);
console.log(`dossier_event=${result.dossier_event.event_name}`);
