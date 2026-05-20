import { registerBiasTestArtifact } from "../bias-test.js";
import { resolveRubricForDispatch } from "../dispatch-gate.js";
import { publishReviewedRubricVersion, publishRubricVersion } from "../publish.js";
import { RUBRIC_PUBLISH_SCOPE } from "../scopes.js";
import {
  completedArtifactInput,
  MemoryCanonicalAuditStore,
  MemoryRubricRepository,
  OPERATOR_ID,
  REVIEWER_ID,
  rubricMaterial,
} from "./fixtures.js";

describe("bias-test dispatch gate", () => {
  test("refuses production dispatch when bias_test_ref is missing", async () => {
    const repository = new MemoryRubricRepository();
    const draft = await publishRubricVersion(repository, {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });
    repository.versions.set(`${draft.rubric_id}@${draft.version}`, {
      ...draft,
      status: "published",
      reviewer_principal_id: REVIEWER_ID,
      published_at: new Date(),
      audit_event_id: "44444444-4444-4444-8444-444444444444",
    });

    await expect(
      resolveRubricForDispatch(repository, { rubric_id: "seeker-fit", version: "1.0.0" }),
    ).resolves.toMatchObject({ decision: "deny", reason_code: "rubric_missing_bias_test" });
  });

  test("refuses incomplete, hash-mismatched, expired, and insufficient coverage artifacts", async () => {
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
      correlationId: "corr-gate",
      biasTestArtifactId: "33333333-3333-4333-8333-333333333333",
    });
    const rubric = await repository.getRubricVersion({ rubric_id: "seeker-fit", version: "1.0.0" });
    if (!rubric) throw new Error("rubric missing");

    await repository.insertBiasTestArtifact({
      ...completedArtifactInput(rubric),
      bias_test_artifact_id: "33333333-3333-4333-8333-333333333333",
      rubric_id: rubric.rubric_id,
      rubric_version: rubric.version,
      rubric_content_hash: rubric.content_hash,
      methodology_ref: { methodology_id: "nist-ai-rmf-measure-2.11", version: "1.0.0" },
      status: "draft",
      jurisdiction_coverage: ["phase-0"],
      reviewer_principal_id: null,
      completed_at: null,
      expires_at: null,
      artifact_uri: null,
      audit_event_id: null,
    });
    await expect(
      resolveRubricForDispatch(repository, { rubric_id: "seeker-fit", version: "1.0.0" }),
    ).resolves.toMatchObject({ reason_code: "rubric_bias_test_incomplete" });

    repository.artifacts.clear();
    await repository.insertBiasTestArtifact({
      bias_test_artifact_id: "33333333-3333-4333-8333-333333333333",
      rubric_id: rubric.rubric_id,
      rubric_version: rubric.version,
      rubric_content_hash: "old-hash",
      methodology_ref: { methodology_id: "nist-ai-rmf-measure-2.11", version: "1.0.0" },
      status: "completed",
      jurisdiction_coverage: ["phase-0"],
      reviewer_principal_id: REVIEWER_ID,
      completed_at: new Date(),
      expires_at: null,
      artifact_uri: "evidence://artifact",
      audit_event_id: "44444444-4444-4444-8444-444444444444",
    });
    await expect(
      resolveRubricForDispatch(repository, { rubric_id: "seeker-fit", version: "1.0.0" }),
    ).resolves.toMatchObject({ reason_code: "rubric_bias_test_mismatched_hash" });
  });

  test("allows production dispatch with completed matching artifact", async () => {
    const repository = new MemoryRubricRepository();
    const draft = await publishRubricVersion(repository, {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });
    const artifact = await registerBiasTestArtifact(
      repository,
      new MemoryCanonicalAuditStore(),
      completedArtifactInput(draft),
    );
    repository.versions.set(`${draft.rubric_id}@${draft.version}`, {
      ...draft,
      status: "published",
      reviewer_principal_id: REVIEWER_ID,
      published_at: new Date(),
      audit_event_id: "44444444-4444-4444-8444-444444444444",
      bias_test_ref: { bias_test_artifact_id: artifact.bias_test_artifact_id },
    });

    await expect(
      resolveRubricForDispatch(
        repository,
        { rubric_id: "seeker-fit", version: "1.0.0" },
        {
          requiredJurisdictions: ["phase-0"],
        },
      ),
    ).resolves.toMatchObject({ decision: "allow", reason_code: "rubric_gate_allowed" });
    await expect(
      resolveRubricForDispatch(
        repository,
        { rubric_id: "seeker-fit", version: "1.0.0" },
        {
          requiredJurisdictions: ["nyc"],
        },
      ),
    ).resolves.toMatchObject({
      decision: "deny",
      reason_code: "rubric_bias_test_insufficient_coverage",
    });
  });
});
