import { createWebhookRouteDeps } from "../../../../../src/employer-api/route-deps";
import {
  handleCreateWebhookEndpoint,
  handleListWebhookEndpoints,
} from "../../../../../src/employer-api/webhook-handlers";
import { withAnonymous } from "../../../../../src/auth/with-anonymous";

export const runtime = "nodejs";

async function getHandler(request: Request): Promise<Response> {
  return handleListWebhookEndpoints(request, createWebhookRouteDeps());
}

async function postHandler(request: Request): Promise<Response> {
  return handleCreateWebhookEndpoint(request, createWebhookRouteDeps());
}

export const GET = withAnonymous(getHandler, {
  route: "/api/employer/v1/webhooks",
  reason: "Authenticated by employer service bearer credential.",
});

export const POST = withAnonymous(postHandler, {
  route: "/api/employer/v1/webhooks",
  reason: "Authenticated by employer service bearer credential.",
});
