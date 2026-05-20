import { registerBiasTestArtifact } from "../bias-test.js";
import { publishRubricVersion } from "../publish.js";
import {
  completedArtifactInput,
  MemoryCanonicalAuditStore,
  MemoryRubricRepository,
  OPERATOR_ID,
  rubricMaterial,
} from "./fixtures.js";

describe("bias-test artifacts", () => {
  test("registers completed bias-test artifact with audit evidence", async () => {
    const repository = new MemoryRubricRepository();
    const rubric = await publishRubricVersion(repository, {
      ...rubricMaterial(),
      author_principal_id: OPERATOR_ID,
    });
    const auditStore = new MemoryCanonicalAuditStore();

    const artifact = await registerBiasTestArtifact(
      repository,
      auditStore,
      completedArtifactInput(rubric),
    );

    expect(artifact).toMatchObject({
      rubric_id: rubric.rubric_id,
      rubric_version: rubric.version,
      rubric_content_hash: rubric.content_hash,
      status: "completed",
      audit_event_id: auditStore.rows[0]?.audit_event_id,
    });
    expect(auditStore.rows[0]).toMatchObject({
      source_table: "bias_test_artifacts",
      event_name: "rubric.bias_test_registered",
      chain_namespace: "rubric-registry",
    });
  });
});
