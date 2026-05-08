// F02 T018 — Next.js 16 middleware (FR-9, FR-29, FR-36).
//
// Resolves the Clerk session for every request, derives the Spyglass
// human tier (without a database round-trip), and applies the
// audience gate per route group:
//
//   - operator surface is hidden — non-operators get 404 (FR-9).
//   - employer/seeker surfaces redirect unauthenticated callers to
//     the audience-specific Clerk sign-in.
//   - wrong-tier authenticated requests get 404 (don't leak which
//     tiers exist).
//
// Full materialization (`materializePrincipal`) happens lazily at the
// request handler via `getPrincipal()` — see T020.

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { audienceForPath, clerkSessionToTier, evaluateAudienceByTier } from "@spyglass/auth";

function parseOperatorOrgIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

const operatorClerkOrgIds = parseOperatorOrgIds(process.env.SPYGLASS_OPERATOR_CLERK_ORG_IDS);

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url);
  const audience = audienceForPath(url.pathname);
  if (audience === null) return;

  const session = await auth();
  const tier = clerkSessionToTier({
    userId: session.userId,
    orgId: session.orgId ?? null,
    orgRole: session.orgRole ?? null,
    operatorClerkOrgIds,
  });

  const decision = evaluateAudienceByTier(audience, tier);
  switch (decision.kind) {
    case "allow":
      return;
    case "not_found":
      return new NextResponse("Not Found", { status: 404 });
    case "unauthorized":
      return NextResponse.redirect(new URL(`/${audience}/sign-in`, req.url));
  }
});

export const config = {
  // Match everything except Next.js internals and static assets.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
