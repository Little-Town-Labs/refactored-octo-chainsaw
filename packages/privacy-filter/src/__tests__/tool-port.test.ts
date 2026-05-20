import { createToolPrivacyFilterPort } from "../tool-port.js";
import { publishPrivacyRuleset } from "../publish.js";
import { InMemoryPrivacyRepository } from "../repo.js";
import { operator, seedRuleset } from "./fixtures.js";

describe("F08.5 privacy-filter port", () => {
  it("turns counterparty_filtered tool output into a filtered view ref", async () => {
    const repository = new InMemoryPrivacyRepository();
    const ruleset = await publishPrivacyRuleset({
      repository,
      principal: operator(),
      ruleset: seedRuleset(),
    });
    const port = createToolPrivacyFilterPort({
      repository,
      ruleset_ref: { ruleset_id: ruleset.ruleset_id, version: ruleset.version },
      audience: "employer",
      disclosure_stage: "intro_guarded",
    });
    const result = await port.filterToolOutput({
      run_id: "run-tool",
      tool_ref: { name: "counterparty_context", version: "1.0.0" },
      output: { summary: "Email seeker@example.com", notes: "private" },
    });
    expect(result.ref).toMatch(/^privacy-filter\/run-tool\//);
    expect(result.output.summary).toContain("[redacted:email]");
    expect(result.output.notes).toBeUndefined();
  });
});
