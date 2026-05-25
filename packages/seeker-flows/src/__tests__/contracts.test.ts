import { readFileSync } from "node:fs";
import { join } from "node:path";

const contractDir = join(
  process.cwd(),
  "../../.specify/specs/020-seeker-conversational-flows/contracts",
);

describe("F20 contract docs", () => {
  it("publishes all seeker-flow schemas", () => {
    for (const file of [
      "seeker-conversation-event.schema.yaml",
      "seeker-flow-state.schema.yaml",
      "seeker-outbound-prompt.schema.yaml",
      "match-notification.schema.yaml",
      "demographic-consent.schema.yaml",
      "seeker-flow-audit-event.schema.yaml",
    ]) {
      const contents = readFileSync(join(contractDir, file), "utf8");
      expect(contents).toContain("schema:");
      expect(contents).toContain("type: object");
      expect(contents).toContain("additionalProperties: false");
    }
  });
});
