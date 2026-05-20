import { filterForCounterparty } from "../filter.js";
import { publishPrivacyRuleset } from "../publish.js";
import { InMemoryPrivacyRepository } from "../repo.js";
import { operator, seedRuleset } from "./fixtures.js";

describe("deterministic privacy filtering", () => {
  it("redacts PII and drops fields not allowed by the active disclosure stage", async () => {
    const repository = new InMemoryPrivacyRepository();
    const ruleset = await publishPrivacyRuleset({
      repository,
      principal: operator(),
      ruleset: seedRuleset(),
    });

    const result = await filterForCounterparty({
      repository,
      request: {
        run_id: "run-1",
        ruleset_ref: { ruleset_id: ruleset.ruleset_id, version: ruleset.version },
        audience: "employer",
        disclosure_stage: "intro_guarded",
        input_class: "seeker_resume",
        source_ref: "resume-1",
        content: {
          headline: "Senior engineer",
          summary: "Email seeker@example.com or call 555-111-2222.",
          private_notes: "salary history is sensitive",
        },
      },
    });

    expect(result.decision.decision).toBe("redact");
    expect(result.projection?.output.summary).toContain("[redacted:email]");
    expect(result.projection?.output.summary).toContain("[redacted:phone]");
    expect(result.projection?.output.private_notes).toBeUndefined();
  });

  it("fails closed for missing rulesets, oversized input, and all-redacted output", async () => {
    const repository = new InMemoryPrivacyRepository();
    const missing = await filterForCounterparty({
      repository,
      request: {
        run_id: "run-2",
        ruleset_ref: { ruleset_id: "missing", version: "1.0.0" },
        audience: "employer",
        input_class: "tool_returned",
        source_ref: "tool",
        content: { summary: "ok" },
      },
    });
    expect(missing.decision.reason_code).toBe("privacy_ruleset_missing");
    expect(missing.projection).toBeNull();

    const ruleset = await publishPrivacyRuleset({
      repository,
      principal: operator(),
      ruleset: { ...seedRuleset(), ruleset_id: "small", max_input_chars: 10 },
    });
    const oversized = await filterForCounterparty({
      repository,
      request: {
        run_id: "run-3",
        ruleset_ref: { ruleset_id: ruleset.ruleset_id, version: ruleset.version },
        audience: "employer",
        input_class: "tool_returned",
        source_ref: "tool",
        content: { summary: "this text is too long" },
      },
    });
    expect(oversized.decision.reason_code).toBe("privacy_payload_oversized");
  });
});
