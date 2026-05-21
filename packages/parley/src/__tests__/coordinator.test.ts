import {
  InMemoryDossierRepository,
  createTestDossierSigningKey,
  verifyDossier,
} from "@spyglass/dossiers";

import { NegotiationContextManager } from "../context.js";
import { coordinateParleyRun } from "../coordinator.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import { DeterministicSideAgentDriver } from "../side-runner.js";
import { testRubric } from "./fixtures.js";

describe("parley coordinator", () => {
  it("runs seeker-first through scoring and produces a signed dossier", async () => {
    const runRepository = new InMemoryParleyRunRepository();
    const run = await runRepository.claimRun({
      run_id: "00000000-0000-7000-8000-000000000808",
      match_ticket_id: "00000000-0000-7000-8000-000000000809",
      match_ticket_identifier: "MT-2026-00809",
      attempt: 1,
      round_cap: 2,
      seeker_contract_ref: { contract_id: "seeker.contract", version: "1.0.0" },
      employer_contract_ref: { contract_id: "employer.contract", version: "1.0.0" },
      privacy_ruleset_ref: { ruleset_id: "standard", version: "1.0.0" },
      harness_version: "f08.0.0",
    });
    const seekerRubric = testRubric({ rubric_id: "seeker.standard", side: "seeker" });
    const employerRubric = testRubric({ rubric_id: "employer.standard", side: "employer" });
    const key = createTestDossierSigningKey("f08-test");
    const dossierRepository = new InMemoryDossierRepository();
    const result = await coordinateParleyRun({
      run,
      runRepository,
      contextManager: new NegotiationContextManager(),
      dossierRepository,
      signingKey: key,
      seeker_rubric: seekerRubric,
      employer_rubric: employerRubric,
      sideAgentDriver: new DeterministicSideAgentDriver(
        {
          seeker: [
            {
              message_to_counterparty: "Seeker is interested.",
              internal_notes: "seeker round one",
              done_signal: true,
              flag_proposals: [],
              model_invocation_ref: "model:seeker:turn:1",
            },
          ],
          employer: [
            {
              message_to_counterparty: "Employer is aligned.",
              internal_notes: "employer round one",
              done_signal: true,
              flag_proposals: [],
              model_invocation_ref: "model:employer:turn:1",
            },
          ],
        },
        {
          seeker: {
            dimension_scores: [
              { dimension_id: "fit", score: 9, rationale: "strong" },
              { dimension_id: "timing", score: 7, rationale: "soon" },
            ],
            headline_rationale: "Seeker sees strong fit.",
            flag_proposals: [],
            model_invocation_ref: "model:seeker:score",
          },
          employer: {
            dimension_scores: [
              { dimension_id: "fit", score: 8, rationale: "strong" },
              { dimension_id: "timing", score: 8, rationale: "ready" },
            ],
            headline_rationale: "Employer sees strong fit.",
            flag_proposals: [],
            model_invocation_ref: "model:employer:score",
          },
        },
      ),
    });

    expect(result.terminal_event.terminal_state).toBe("complete");
    expect(result.dossier.status).toBe("conclusive");
    expect(result.dossier.projection_refs).toEqual(
      expect.objectContaining({
        seeker: expect.any(String),
        employer: expect.any(String),
        auditor: expect.any(String),
        a2a_receiver: expect.any(String),
      }),
    );
    await expect(
      verifyDossier({
        repository: dossierRepository,
        dossier: result.dossier,
        keys: { resolve: () => key.publicKey },
      }),
    ).resolves.toMatchObject({ decision: "valid" });
  });

  it("turns scoring gaps into inconclusive dossiers", async () => {
    const runRepository = new InMemoryParleyRunRepository();
    const run = await runRepository.claimRun({
      run_id: "00000000-0000-7000-8000-000000000810",
      match_ticket_id: "00000000-0000-7000-8000-000000000811",
      match_ticket_identifier: "MT-2026-00811",
      attempt: 1,
      round_cap: 1,
      seeker_contract_ref: { contract_id: "seeker.contract", version: "1.0.0" },
      employer_contract_ref: { contract_id: "employer.contract", version: "1.0.0" },
      privacy_ruleset_ref: { ruleset_id: "standard", version: "1.0.0" },
      harness_version: "f08.0.0",
    });
    const rubric = testRubric({ rubric_id: "seeker.standard", side: "seeker" });
    const result = await coordinateParleyRun({
      run,
      runRepository,
      contextManager: new NegotiationContextManager(),
      dossierRepository: new InMemoryDossierRepository(),
      signingKey: createTestDossierSigningKey("f08-test"),
      seeker_rubric: rubric,
      employer_rubric: testRubric({ rubric_id: "employer.standard", side: "employer" }),
      sideAgentDriver: new DeterministicSideAgentDriver(
        {
          seeker: [
            {
              message_to_counterparty: "hello",
              internal_notes: "note",
              done_signal: true,
              flag_proposals: [],
            },
          ],
          employer: [
            {
              message_to_counterparty: "hello",
              internal_notes: "note",
              done_signal: true,
              flag_proposals: [],
            },
          ],
        },
        {
          seeker: { dimension_scores: [], headline_rationale: "", flag_proposals: [] },
          employer: { dimension_scores: [], headline_rationale: "", flag_proposals: [] },
        },
      ),
    });

    expect(result.terminal_event.terminal_state).toBe("inconclusive");
    expect(result.dossier.inconclusive_flags[0]?.reason_code).toBe("scoring_gap");
  });
});
