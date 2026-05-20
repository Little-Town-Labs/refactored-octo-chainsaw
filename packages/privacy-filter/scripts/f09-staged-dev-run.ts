import { strict as assert } from "node:assert";

import {
  createToolPrivacyFilterPort,
  InMemoryPrivacyRepository,
  publishPrivacyRuleset,
  readPrivacyReviewBundle,
  validateUntrustedEnvelope,
  wrapUntrustedText,
} from "../src/index.js";
import { operator, seedRuleset } from "../src/__tests__/fixtures.js";

const repository = new InMemoryPrivacyRepository();
const ruleset = await publishPrivacyRuleset({
  repository,
  principal: operator(),
  ruleset: seedRuleset(),
});

const envelope = wrapUntrustedText({
  run_id: "run-f09",
  nonce: "nonce-f09",
  input_class: "seeker_resume",
  source_ref: "resume:1",
  text: "Contact me at seeker@example.com or 555-111-2222.",
});
assert.equal(validateUntrustedEnvelope(envelope).ok, true);

const port = createToolPrivacyFilterPort({
  repository,
  ruleset_ref: { ruleset_id: ruleset.ruleset_id, version: ruleset.version },
  audience: "employer",
  disclosure_stage: "intro_guarded",
});
const filtered = await port.filterToolOutput({
  run_id: "run-f09",
  tool_ref: { name: "counterparty_context", version: "1.0.0" },
  output: { summary: "Great candidate. Email seeker@example.com.", notes: "private" },
});
assert.match(filtered.ref, /^privacy-filter\/run-f09\//);
assert.equal(filtered.output.notes, undefined);
assert.match(String(filtered.output.summary), /\[redacted:email\]/);

const review = await readPrivacyReviewBundle({
  repository,
  principal: { principal_id: "reviewer", scopes: ["privacy_filter:review"] },
  run_id: "run-f09",
});
assert.equal(review.rulesets.length, 1);
assert.equal(review.decisions.length, 1);

console.log(
  JSON.stringify(
    {
      ruleset: `${ruleset.ruleset_id}@${ruleset.version}`,
      filtered_ref: filtered.ref,
      decisions: review.decisions.length,
      redactions: review.decisions[0]?.redaction_summary ?? {},
    },
    null,
    2,
  ),
);
