import { resolveRubricForDispatch } from "../dispatch-gate.js";
import { publishReviewedRubricVersion, publishRubricVersion } from "../publish.js";
import { RUBRIC_PUBLISH_SCOPE } from "../scopes.js";
import {
  MemoryCanonicalAuditStore,
  MemoryRubricRepository,
  OPERATOR_ID,
  REVIEWER_ID,
  rubricMaterial,
} from "./fixtures.js";

describe("rubric dispatch resolution", () => {
  test("allows a published rubric when production bias gate is disabled", async () => {
    const repository = new MemoryRubricRepository();
    await publishReviewedRubricVersion(repository, new MemoryCanonicalAuditStore(), {
      ...rubricMaterial(),
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [RUBRIC_PUBLISH_SCOPE],
      },
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "initial_launch",
      correlationId: "corr-resolve",
      biasTestArtifactId: "artifact-missing-ok-non-prod",
    });

    await expect(
      resolveRubricForDispatch(
        repository,
        { rubric_id: "seeker-fit", version: "1.0.0" },
        { production: false },
      ),
    ).resolves.toMatchObject({ decision: "allow", reason_code: "rubric_gate_allowed" });
  });

  test("denies missing and unpublished rubrics", async () => {
    const repository = new MemoryRubricRepository();
    await publishRubricVersion(repository, {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });

    await expect(
      resolveRubricForDispatch(repository, { rubric_id: "missing", version: "1.0.0" }),
    ).resolves.toMatchObject({ decision: "deny", reason_code: "rubric_missing" });
    await expect(
      resolveRubricForDispatch(repository, { rubric_id: "seeker-fit", version: "1.0.0" }),
    ).resolves.toMatchObject({ decision: "deny", reason_code: "rubric_unpublished" });
  });
});
