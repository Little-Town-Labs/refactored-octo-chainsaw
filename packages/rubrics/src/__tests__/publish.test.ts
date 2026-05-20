import {
  publishReviewedRubricVersion,
  publishRubricVersion,
  RubricVersionMutationError,
} from "../publish.js";
import { RUBRIC_PUBLISH_SCOPE } from "../scopes.js";
import {
  MemoryCanonicalAuditStore,
  MemoryRubricRepository,
  OPERATOR_ID,
  REVIEWER_ID,
  rubricMaterial,
} from "./fixtures.js";

describe("rubric publication", () => {
  test("publishes a draft rubric and rejects different material for the same version", async () => {
    const repository = new MemoryRubricRepository();
    const first = await publishRubricVersion(repository, {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });

    await expect(
      publishRubricVersion(repository, {
        ...rubricMaterial(),
        description: "Changed material.",
        author_principal_id: OPERATOR_ID,
      }),
    ).rejects.toBeInstanceOf(RubricVersionMutationError);
    expect(first.status).toBe("draft");
  });

  test("publishes reviewed rubric with audit linkage", async () => {
    const repository = new MemoryRubricRepository();
    const auditStore = new MemoryCanonicalAuditStore();

    const result = await publishReviewedRubricVersion(repository, auditStore, {
      ...rubricMaterial(),
      operator: {
        principal_id: OPERATOR_ID,
        principal_kind: "human",
        scopes: [RUBRIC_PUBLISH_SCOPE],
      },
      reviewerPrincipalId: REVIEWER_ID,
      reasonCode: "initial_launch",
      correlationId: "corr-rubric-publish",
      biasTestArtifactId: "33333333-3333-4333-8333-333333333333",
      publishedAt: new Date("2026-05-20T12:00:00.000Z"),
    });

    expect(result.rubric).toMatchObject({
      rubric_id: "seeker-fit",
      version: "1.0.0",
      status: "published",
      author_principal_id: OPERATOR_ID,
      reviewer_principal_id: REVIEWER_ID,
      bias_test_ref: { bias_test_artifact_id: "33333333-3333-4333-8333-333333333333" },
    });
    expect(result.event).toMatchObject({
      rubric_version_id: result.rubric.rubric_version_id,
      event_type: "published",
      reason_code: "initial_launch",
      audit_event_id: auditStore.rows[0]?.audit_event_id,
    });
    expect(auditStore.rows[0]).toMatchObject({
      source_table: "rubric_events",
      event_name: "rubric.published",
      chain_namespace: "rubric-registry",
    });
  });
});
