import {
  BIAS_TEST_REGISTER_SCOPE,
  RUBRIC_PUBLISH_SCOPE,
  computeWeightedScore,
  publishRubricVersion,
  registerBiasTestArtifact,
  resolveRubricForDispatch,
} from "../src/index.js";
import {
  MemoryCanonicalAuditStore,
  MemoryRubricRepository,
  OPERATOR_ID,
  REVIEWER_ID,
  completedArtifactInput,
  rubricMaterial,
} from "../src/__tests__/fixtures.js";

async function main(): Promise<void> {
  const repository = new MemoryRubricRepository();
  const auditStore = new MemoryCanonicalAuditStore();

  const draft = await publishRubricVersion(repository, {
    ...rubricMaterial(),
    author_principal_id: OPERATOR_ID,
  });
  repository.versions.set(`${draft.rubric_id}@${draft.version}`, {
    ...draft,
    status: "published",
    reviewer_principal_id: REVIEWER_ID,
    published_at: new Date("2026-05-20T14:00:00.000Z"),
    audit_event_id: "44444444-4444-4444-8444-444444444444",
  });
  const missingEvidence = await resolveRubricForDispatch(
    repository,
    { rubric_id: draft.rubric_id, version: draft.version },
    { production: true },
  );

  const artifact = await registerBiasTestArtifact(repository, auditStore, {
    ...completedArtifactInput(draft),
    operator: {
      principal_id: OPERATOR_ID,
      principal_kind: "human",
      scopes: [BIAS_TEST_REGISTER_SCOPE],
    },
  });

  repository.versions.set(`${draft.rubric_id}@${draft.version}`, {
    ...draft,
    status: "published",
    reviewer_principal_id: REVIEWER_ID,
    published_at: new Date("2026-05-20T14:00:00.000Z"),
    audit_event_id: auditStore.rows[0]?.audit_event_id ?? null,
    bias_test_ref: { bias_test_artifact_id: artifact.bias_test_artifact_id },
  });

  const allowed = await resolveRubricForDispatch(
    repository,
    { rubric_id: draft.rubric_id, version: draft.version },
    { requiredJurisdictions: ["phase-0"] },
  );
  const score = computeWeightedScore({
    rubric: allowed.rubric ?? draft,
    dimensionScores: [
      { dimension_id: "skills", score: 4 },
      { dimension_id: "availability", score: 5 },
    ],
    modelHolisticScore: 1,
  });

  console.log(
    JSON.stringify(
      {
        draft: `${draft.rubric_id}@${draft.version}`,
        missingEvidence: missingEvidence.reason_code,
        artifact: artifact.bias_test_artifact_id,
        allowed: allowed.reason_code,
        score: score.total_score,
        holisticIgnored: score.model_holistic_score_ignored,
        publishScope: RUBRIC_PUBLISH_SCOPE,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
