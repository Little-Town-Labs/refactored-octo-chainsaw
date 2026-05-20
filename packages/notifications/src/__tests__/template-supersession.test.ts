import { createNotificationArtifact } from "../artifacts.js";
import { InMemoryNotificationRepository } from "../repo.js";
import { supersedeNoticeTemplate } from "../templates.js";
import { artifactInput, template } from "./fixtures.js";

describe("template supersession", () => {
  it("does not mutate artifacts pinned to older versions", async () => {
    const repository = new InMemoryNotificationRepository();
    const original = await repository.insertTemplate(template());
    const artifact = await createNotificationArtifact({
      repository,
      artifact: artifactInput({ template: original }),
    });
    await supersedeNoticeTemplate({ repository, template: original });
    expect(artifact.template_version).toBe("1.0.0");
    expect((await repository.getArtifact(artifact.artifact_id))?.template_version).toBe("1.0.0");
  });
});
