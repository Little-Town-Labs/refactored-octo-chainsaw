import { renderPrompt } from "../prompt-renderer.js";
import { promptFixture, sentinelText } from "./fixtures.js";

describe("prompt renderer", () => {
  test("renders prompt and preserves sentinel boundaries", () => {
    const result = renderPrompt(promptFixture(), { candidate_context: sentinelText() });
    expect("rendered" in result && result.rendered).toContain("<SPYGLASS_UNTRUSTED");
  });

  test("refuses missing and unsentinelized variables", () => {
    expect(renderPrompt(promptFixture(), {})).toHaveProperty(
      "reason_code",
      "prompt_variable_missing",
    );
    expect(renderPrompt(promptFixture(), { candidate_context: "plain text" })).toHaveProperty(
      "reason_code",
      "unsafe_prompt_variable",
    );
  });
});
