// F02 T018/T030/T034 — Next.js 16 middleware (FR-9, FR-11–13, FR-29, FR-36).
//
// Resolves the Clerk session for every request and delegates the
// audience + AAL2 decision to the pure `decideRouteAccess` function
// in `@spyglass/auth`. The middleware itself only handles request-
// shaped concerns: building the input, mapping the typed decision
// to `Response` / `NextResponse.redirect()`.
//
// All policy lives in the pure function, which has full unit-test
// coverage including the FR-9 hidden-operator-surface and the
// FR-11/12/13 AAL2 step-up paths (T029, T034).

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { decideRouteAccess, parseOperatorClerkOrgIds } from "@spyglass/auth";

const operatorClerkOrgIds = parseOperatorClerkOrgIds(process.env.SPYGLASS_OPERATOR_CLERK_ORG_IDS);

function signInPathForAudience(audience: "seeker" | "employer" | "operator"): string {
  return audience === "seeker" ? "/sign-in" : `/${audience}/sign-in`;
}

function responseForDecision(
  decision: ReturnType<typeof decideRouteAccess>,
  req: Request,
): Response | void {
  switch (decision.kind) {
    case "allow":
    case "public":
      return;
    case "not_found":
      return new NextResponse("Not Found", { status: 404 });
    case "redirect_sign_in":
    case "redirect_step_up":
      // Clerk's catch-all sign-in surface drives both first-factor
      // sign-in and the AAL2 step-up challenge from the same URL.
      return NextResponse.redirect(new URL(signInPathForAudience(decision.audience), req.url));
  }
}

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url);
  const session = await auth();
  const fva = session.factorVerificationAge;
  const secondFactorVerificationAge = Array.isArray(fva) && fva.length >= 2 ? (fva[1] ?? -1) : -1;

  return responseForDecision(
    decideRouteAccess({
      pathname: url.pathname,
      session: {
        userId: session.userId,
        orgId: session.orgId ?? null,
        orgRole: session.orgRole ?? null,
        operatorClerkOrgIds,
      },
      aal: { secondFactorVerificationAge },
    }),
    req,
  );
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
    // Always run for Clerk's auto-proxy path.
    "/__clerk/(.*)",
  ],
};
