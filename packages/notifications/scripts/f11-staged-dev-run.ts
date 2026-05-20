import { strict as assert } from "node:assert";

import {
  createDeliveryCommand,
  createNotificationArtifact,
  evaluateNotificationGate,
  InMemoryNotificationRepository,
  noticeTiming,
  publishNoticeTemplate,
  readNotificationReviewBundle,
} from "../src/index.js";
import { operator, policyRef } from "../src/__tests__/fixtures.js";

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

const timing = noticeTiming({
  basis: "advance_notice",
  produced_at: new Date("2026-05-20T00:00:00Z"),
  earliest_delivery_at: new Date("2026-06-03T00:00:00Z"),
  business_days_required: 10,
  calendar_ref: "calendar:nyc-business-days:test",
});

const artifact = await createNotificationArtifact({
  repository,
  artifact: {
    match_id: "00000000-0000-7000-8000-000000000201",
    run_id: "run-f11",
    dossier_id: "00000000-0000-7000-8000-000000000301",
    candidate_principal_id: "00000000-0000-7000-8000-000000000401",
    notice_category: "advance_aedt_notice",
    template,
    jurisdiction_refs: ["US-NY-NYC"],
    policy_ref: policyRef(),
    timing,
    content_refs: ["notice-content:f11:advance:1"],
  },
});
const rebuilt = await createNotificationArtifact({
  repository: new InMemoryNotificationRepository(),
  artifact: {
    match_id: "00000000-0000-7000-8000-000000000201",
    run_id: "run-f11",
    dossier_id: "00000000-0000-7000-8000-000000000301",
    candidate_principal_id: "00000000-0000-7000-8000-000000000401",
    notice_category: "advance_aedt_notice",
    template,
    jurisdiction_refs: ["US-NY-NYC"],
    policy_ref: policyRef(),
    timing,
    content_refs: ["notice-content:f11:advance:1"],
  },
});
assert.equal(artifact.content_hash, rebuilt.content_hash);

const refused = await evaluateNotificationGate({
  repository,
  match_id: artifact.match_id,
  artifact,
  template,
  policy_ref: policyRef(),
  evaluated_at: new Date("2026-06-02T00:00:00Z"),
});
assert.equal(refused.reason_code, "not_yet_eligible");

const allowed = await evaluateNotificationGate({
  repository,
  match_id: artifact.match_id,
  artifact,
  template,
  policy_ref: policyRef(),
  evaluated_at: new Date("2026-06-03T00:00:00Z"),
});
assert.equal(allowed.reason_code, "notice_ready");

const command = await createDeliveryCommand({
  repository,
  artifact,
  gate: allowed,
  channel_intent: "email",
});
const review = await readNotificationReviewBundle({
  repository,
  principal: operator(),
  match_id: artifact.match_id,
});
assert.equal(review.artifacts.length, 1);
assert.equal(review.gate_events.length, 2);
assert.equal(review.delivery_commands.length, 1);

console.log(
  JSON.stringify(
    {
      artifact: artifact.artifact_id,
      content_hash: artifact.content_hash,
      refused: refused.reason_code,
      allowed: allowed.reason_code,
      command: command.idempotency_key,
      review_artifacts: review.artifacts.length,
    },
    null,
    2,
  ),
);
