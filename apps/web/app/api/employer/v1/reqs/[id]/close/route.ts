import { createEmployerReqRouteDeps } from "../../../../../../../src/employer-api/route-deps";
import { handleCloseReq } from "../../../../../../../src/employer-api/req-handlers";
import { withAnonymous } from "../../../../../../../src/auth/with-anonymous";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }> | { readonly id: string };
}

async function postHandler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleCloseReq(request, createEmployerReqRouteDeps(), params.id);
}

export const POST = withAnonymous(postHandler, {
  route: "/api/employer/v1/reqs/[id]/close",
  reason: "Authenticated by employer service bearer credential.",
});
