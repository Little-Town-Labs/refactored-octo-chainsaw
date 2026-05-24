import { readFileSync } from "node:fs";
import { join } from "node:path";

const contractDir = join(process.cwd(), "../../.specify/specs/019-web-chat-channel/contracts");

describe("web-chat contract docs", () => {
  it("publishes client event, render, delivery, accessibility, and audit schemas", () => {
    for (const file of [
      "web-chat-client-event.schema.yaml",
      "web-chat-render-model.schema.yaml",
      "web-chat-delivery-status.schema.yaml",
      "web-chat-accessibility-contract.schema.yaml",
      "web-chat-audit-event.schema.yaml",
    ]) {
      const contents = readFileSync(join(contractDir, file), "utf8");
      expect(contents).toContain("title:");
      expect(contents).toContain("type: object");
    }
  });
});
