// F02 T039 — `/.well-known/jwks.json` (FR-18, NFR-2).
//
// Renders the agent JWKS for offline verifier use. Service-purpose
// keys are exposed via a separate route in B5; this endpoint is
// scoped to `purpose='agent'` so the agent verifier doesn't have to
// filter.
//
// Anonymous by design — JWKS contents are public per RFC 7517.
// Cache headers tell the verifier to re-fetch on a 5-min TTL
// (matches the verifier-side cache in the plan).

import { buildJwks } from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { createDrizzleJwksRepo } from "../../../src/auth/jwks-repo.js";
import { withAnonymous } from "../../../src/auth/with-anonymous.js";

export const runtime = "nodejs";

async function getHandler(): Promise<Response> {
  const repo = createDrizzleJwksRepo(getDb());
  const rows = await repo.listVisibleKeys("agent", new Date());
  const jwks = buildJwks(rows);
  return new Response(JSON.stringify(jwks), {
    status: 200,
    headers: {
      "content-type": "application/jwk-set+json",
      "cache-control": "public, max-age=300",
    },
  });
}

export const GET = withAnonymous(getHandler, {
  route: "/.well-known/jwks.json",
  reason: "JWKS contents are public per RFC 7517.",
});
