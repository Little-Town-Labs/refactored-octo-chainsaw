import { InMemoryNotificationRepository } from "../repo.js";
import { publishNoticeTemplate } from "../templates.js";

describe("notice template publication", () => {
  it("publishes immutable notice template versions", async () => {
    const repository = new InMemoryNotificationRepository();
    const template = await publishNoticeTemplate({
      repository,
      template_id: "candidate-aedt-advance",
      version: "1.0.0",
      notice_category: "advance_aedt_notice",
      jurisdiction_scope: ["US-NY-NYC"],
      content_ref: "notice-content:f11:advance:1",
      content: { body: "Candidate AEDT advance notice" },
      effective_from: new Date("2026-05-20T00:00:00Z"),
    });
    expect(template.status).toBe("published");
    expect(template.content_hash).toMatch(/^sha256:/);
    expect((await repository.listTemplates("candidate-aedt-advance"))[0]?.version).toBe("1.0.0");
  });
});
