import { createEmployerReqRouteDeps } from "../../../../../src/employer-api/route-deps";
import { handleCreateReq, handleListReqs } from "../../../../../src/employer-api/req-handlers";
import { withAnonymous } from "../../../../../src/auth/with-anonymous";

export const runtime = "nodejs";

async function getHandler(request: Request): Promise<Response> {
  return handleListReqs(request, createEmployerReqRouteDeps());
}

async function postHandler(request: Request): Promise<Response> {
  return handleCreateReq(request, createEmployerReqRouteDeps());
}

export const GET = withAnonymous(getHandler, {
  route: "/api/employer/v1/reqs",
  reason: "Authenticated by employer service bearer credential.",
});

export const POST = withAnonymous(postHandler, {
  route: "/api/employer/v1/reqs",
  reason: "Authenticated by employer service bearer credential.",
});
