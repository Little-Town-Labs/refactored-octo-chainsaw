import { createEmployerReqRouteDeps } from "../../../../../../src/employer-api/route-deps";
import { handleReadReq, handleUpdateReq } from "../../../../../../src/employer-api/req-handlers";
import { withAnonymous } from "../../../../../../src/auth/with-anonymous";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }> | { readonly id: string };
}

async function getHandler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleReadReq(request, createEmployerReqRouteDeps(), params.id);
}

async function patchHandler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleUpdateReq(request, createEmployerReqRouteDeps(), params.id);
}

export const GET = withAnonymous(getHandler, {
  route: "/api/employer/v1/reqs/[id]",
  reason: "Authenticated by employer service bearer credential.",
});

export const PATCH = withAnonymous(patchHandler, {
  route: "/api/employer/v1/reqs/[id]",
  reason: "Authenticated by employer service bearer credential.",
});
