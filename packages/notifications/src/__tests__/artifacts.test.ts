import { contentHash } from "../canonicalize.js";
import { createNotificationArtifact } from "../artifacts.js";
import { InMemoryNotificationRepository } from "../repo.js";
import { artifactInput, template } from "./fixtures.js";

describe("candidate notification artifacts", () => {
  it("creates deterministic artifacts from identical dossier-produced evidence", async () => {
    const firstRepo = new InMemoryNotificationRepository();
    const secondRepo = new InMemoryNotificationRepository();
    const first = await createNotificationArtifact({
      repository: firstRepo,
      artifact: artifactInput({ template: template() }),
    });
    const second = await createNotificationArtifact({
      repository: secondRepo,
      artifact: artifactInput({ template: template() }),
    });
    expect(first.content_hash).toBe(second.content_hash);
    expect(first.template_version).toBe("1.0.0");
    expect(first.status).toBe("ready");
  });

  it("fails closed when required recipient refs are missing", async () => {
    await expect(
      createNotificationArtifact({
        repository: new InMemoryNotificationRepository(),
        artifact: artifactInput({ candidate_principal_id: null }),
      }),
    ).rejects.toThrow("missing_required_ref");
    expect(contentHash({ reason_code: "missing_required_ref" })).toMatch(/^sha256:/);
  });
});
