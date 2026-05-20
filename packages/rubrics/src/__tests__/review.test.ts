import { registerBiasTestArtifact } from "../bias-test.js";
import { publishRubricVersion } from "../publish.js";
import { readBiasTestArtifacts, readRubricVersions } from "../review.js";
import { RUBRIC_READ_SCOPE } from "../scopes.js";
import {
  completedArtifactInput,
  MemoryCanonicalAuditStore,
  MemoryRubricRepository,
  OPERATOR_ID,
  REVIEWER_ID,
  rubricMaterial,
} from "./fixtures.js";

describe("rubric review reads", () => {
  test("returns scoped rubric and bias-test history", async () => {
    const repository = new MemoryRubricRepository();
    const rubric = await publishRubricVersion(repository, {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });
    await registerBiasTestArtifact(
      repository,
      new MemoryCanonicalAuditStore(),
      completedArtifactInput(rubric),
    );
    const principal = {
      principal_id: REVIEWER_ID,
      principal_kind: "human" as const,
      scopes: [RUBRIC_READ_SCOPE],
    };

    await expect(
      readRubricVersions(repository, { principal, rubricId: "seeker-fit" }),
    ).resolves.toHaveLength(1);
    await expect(
      readBiasTestArtifacts(repository, { principal, rubricId: "seeker-fit" }),
    ).resolves.toHaveLength(1);
  });
});
