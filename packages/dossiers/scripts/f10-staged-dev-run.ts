import { strict as assert } from "node:assert";

import {
  buildDossier,
  createTestDossierSigningKey,
  InMemoryDossierRepository,
  readDossierReviewBundle,
  signDossier,
  signingContentHash,
  verifyDossier,
} from "../src/index.js";
import { dossierInput, operator } from "../src/__tests__/fixtures.js";

const repository = new InMemoryDossierRepository();
const key = createTestDossierSigningKey("f10-staged-key");
const input = dossierInput({ match_id: "00000000-0000-7000-8000-000000000123" });

const first = await buildDossier({ repository, dossier: input });
const second = await buildDossier({ repository: new InMemoryDossierRepository(), dossier: input });
assert.equal(
  signingContentHash({
    ...first,
    dossier_id: "stable",
    content_hash: "stable",
    created_at: new Date("2026-05-20T00:00:00Z"),
    projection_refs: {
      seeker: "stable",
      employer: "stable",
      auditor: "stable",
      a2a_receiver: "stable",
    },
  }),
  signingContentHash({
    ...second,
    dossier_id: "stable",
    content_hash: "stable",
    created_at: new Date("2026-05-20T00:00:00Z"),
    projection_refs: {
      seeker: "stable",
      employer: "stable",
      auditor: "stable",
      a2a_receiver: "stable",
    },
  }),
);

const signed = await signDossier({ repository, dossier: first, key });
const verification = await verifyDossier({
  repository,
  dossier: signed,
  keys: { resolve: (kid) => (kid === key.kid ? key.publicKey : null) },
});
assert.equal(verification.decision, "valid");

const inconclusive = await buildDossier({
  repository,
  dossier: {
    ...dossierInput({ run_id: "run-f10-inconclusive" }),
    status: "inconclusive",
    projections: input.projections.slice(0, 3),
    inconclusive_flags: [
      {
        reason_code: "tool_failure",
        source_ref: "tool:counterparty_context",
        resolution_hint: "Retry the failed tool before conclusive delivery.",
      },
    ],
  },
});
assert.equal(inconclusive.status, "inconclusive");

const review = await readDossierReviewBundle({ repository, principal: operator() });
assert.equal(review.dossiers.length, 2);

console.log(
  JSON.stringify(
    {
      dossier: signed.dossier_id,
      content_hash: signed.content_hash,
      verification: verification.reason_code,
      projections: (await repository.listProjections(signed.dossier_id)).length,
      inconclusive_flags: inconclusive.inconclusive_flags.length,
    },
    null,
    2,
  ),
);
