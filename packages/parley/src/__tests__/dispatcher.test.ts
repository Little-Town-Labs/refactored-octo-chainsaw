import { dispatchParley } from "../dispatcher.js";
import { InMemoryParleyRunRepository } from "../repo.js";
import {
  MemoryContractRepo,
  MemoryRubricRepo,
  MemoryToolRepo,
  testContract,
  testDescriptor,
  testRubric,
  testSurface,
} from "./fixtures.js";

describe("parley dispatcher", () => {
  it("claims one active run with frozen refs", async () => {
    const descriptor = testDescriptor();
    const surface = testSurface("shared-tools", descriptor);
    const seekerRubric = testRubric({ rubric_id: "seeker.standard", side: "seeker" });
    const employerRubric = testRubric({ rubric_id: "employer.standard", side: "employer" });
    const runRepository = new InMemoryParleyRunRepository();
    const result = await dispatchParley({
      request: request(),
      runRepository,
      contractRepository: new MemoryContractRepo([
        testContract({
          contract_id: "seeker.contract",
          side: "seeker",
          rubric_id: seekerRubric.rubric_id,
          tool_surface_id: surface.surface_id,
          max_rounds: 2,
        }),
        testContract({
          contract_id: "employer.contract",
          side: "employer",
          rubric_id: employerRubric.rubric_id,
          tool_surface_id: surface.surface_id,
          max_rounds: 3,
        }),
      ]),
      rubricRepository: new MemoryRubricRepo([seekerRubric, employerRubric]),
      toolRepository: new MemoryToolRepo([surface], [descriptor]),
      config: { default_round_cap: 3 },
    });

    expect(result.decision).toBe("allow");
    if (result.decision === "allow") {
      const duplicate = await dispatchParley({
        request: request(),
        runRepository,
        contractRepository: new MemoryContractRepo([
          testContract({
            contract_id: "seeker.contract",
            side: "seeker",
            rubric_id: seekerRubric.rubric_id,
            tool_surface_id: surface.surface_id,
            max_rounds: 2,
          }),
          testContract({
            contract_id: "employer.contract",
            side: "employer",
            rubric_id: employerRubric.rubric_id,
            tool_surface_id: surface.surface_id,
            max_rounds: 3,
          }),
        ]),
        rubricRepository: new MemoryRubricRepo([seekerRubric, employerRubric]),
        toolRepository: new MemoryToolRepo([surface], [descriptor]),
        config: { default_round_cap: 3 },
      });
      expect(result.run.round_cap).toBe(2);
      expect(duplicate.decision).toBe("allow");
      if (duplicate.decision === "allow") {
        expect(duplicate.run.run_id).toBe(result.run.run_id);
      }
      expect(result.frozen_refs.seeker_contract.contract_id).toBe("seeker.contract");
      await expect(
        runRepository.claimRun({
          run_id: "00000000-0000-7000-8000-000000000999",
          match_ticket_id: result.run.match_ticket_id,
          match_ticket_identifier: result.run.match_ticket_identifier,
          attempt: result.run.attempt,
          round_cap: result.run.round_cap,
          seeker_contract_ref: result.run.seeker_contract_ref,
          employer_contract_ref: result.run.employer_contract_ref,
          privacy_ruleset_ref: result.run.privacy_ruleset_ref,
          harness_version: result.run.harness_version,
        }),
      ).rejects.toThrow(/match_ticket_concurrent_run_claimed/);
    }
  });

  it("denies dispatch when rubric lacks bias evidence", async () => {
    const descriptor = testDescriptor();
    const surface = testSurface("shared-tools", descriptor);
    const result = await dispatchParley({
      request: request(),
      runRepository: new InMemoryParleyRunRepository(),
      contractRepository: new MemoryContractRepo([
        testContract({
          contract_id: "seeker.contract",
          side: "seeker",
          rubric_id: "seeker.standard",
          tool_surface_id: surface.surface_id,
        }),
        testContract({
          contract_id: "employer.contract",
          side: "employer",
          rubric_id: "employer.standard",
          tool_surface_id: surface.surface_id,
        }),
      ]),
      rubricRepository: new MemoryRubricRepo([
        testRubric({ rubric_id: "seeker.standard", side: "seeker", withBias: false }),
        testRubric({ rubric_id: "employer.standard", side: "employer" }),
      ]),
      toolRepository: new MemoryToolRepo([surface], [descriptor]),
    });

    expect(result).toMatchObject({
      decision: "deny",
      reason_code: "rubric_missing_bias_test",
    });
  });
});

function request() {
  return {
    event_name: "match_ticket.match_made" as const,
    event_version: 1 as const,
    correlation_id: "00000000-0000-7000-8000-000000000801",
    match_ticket_id: "00000000-0000-7000-8000-000000000802",
    match_ticket_identifier: "MT-2026-00801",
    attempt: 1,
    seeker_contract_ref: { contract_id: "seeker.contract", version: "1.0.0" },
    employer_contract_ref: { contract_id: "employer.contract", version: "1.0.0" },
    privacy_ruleset_ref: { ruleset_id: "standard", version: "1.0.0" },
  };
}
