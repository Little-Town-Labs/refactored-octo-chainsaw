// F02 T020 — Server-side `getPrincipal()` (FR-2, FR-37, EC-1).
//
// Memoized-per-request accessor for the calling principal. The first
// caller in a request triggers lazy materialization from the Clerk
// session; subsequent callers receive the cached `HumanPrincipal`.
//
// React.cache scopes the memo to one server-rendering pass — exactly
// the per-request behavior we want without standing up an explicit
// AsyncLocalStorage. Route handlers that don't render React (e.g.
// API routes) pay one materialization per call, which is fine.
//
// Constitution refs: §I.5.1 (authentication), §I.5.3 (audit each
// materialization).

import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { randomUUID } from "node:crypto";

import {
  parseOperatorClerkOrgIds,
  PrincipalRequiredError,
  type HumanPrincipal,
} from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { createConsoleAuditSink } from "./audit-sink";
import { createDrizzlePrincipalRepo } from "./principal-repo";
import { resolvePrincipalFromSession, type ResolveDeps } from "./session-resolver";

let cachedDeps: ResolveDeps | undefined;

function getDeps(): ResolveDeps {
  if (cachedDeps) return cachedDeps;
  cachedDeps = {
    repo: createDrizzlePrincipalRepo(getDb()),
    sink: createConsoleAuditSink(),
    operatorClerkOrgIds: parseOperatorClerkOrgIds(process.env.SPYGLASS_OPERATOR_CLERK_ORG_IDS),
    now: () => Math.floor(Date.now() / 1000),
    correlationId: () => randomUUID(),
  };
  return cachedDeps;
}

/**
 * Variant that returns `null` instead of throwing when there is no
 * session. Useful for mixed surfaces (e.g., a marketing page that
 * personalizes when signed in).
 */
export const tryGetPrincipal = cache(async (): Promise<HumanPrincipal | null> => {
  const session = await auth();
  return resolvePrincipalFromSession(
    {
      userId: session.userId,
      orgId: session.orgId ?? null,
      orgRole: session.orgRole ?? null,
    },
    getDeps(),
  );
});

/**
 * Memoized per-request principal accessor. Throws
 * `PrincipalRequiredError` when called from an unauthenticated
 * surface (the proxy.ts middleware should have rejected it earlier;
 * this is the fail-safe deny per Constitution §I.6).
 */
export const getPrincipal = cache(async (): Promise<HumanPrincipal> => {
  const principal = await tryGetPrincipal();
  if (principal === null) throw new PrincipalRequiredError();
  return principal;
});
