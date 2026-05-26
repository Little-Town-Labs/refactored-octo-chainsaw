import { createWebhookRouteDeps } from "../../../../../../src/employer-api/route-deps";
import {
  handleDeleteWebhookEndpoint,
  handleDisableWebhookEndpoint,
} from "../../../../../../src/employer-api/webhook-handlers";
import { withAnonymous } from "../../../../../../src/auth/with-anonymous";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly id: string }> | { readonly id: string };
}

async function deleteHandler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleDeleteWebhookEndpoint(request, createWebhookRouteDeps(), params.id);
}

async function patchHandler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  return handleDisableWebhookEndpoint(request, createWebhookRouteDeps(), params.id);
}

export const DELETE = withAnonymous(deleteHandler, {
  route: "/api/employer/v1/webhooks/[id]",
  reason: "Authenticated by employer service bearer credential.",
});

export const PATCH = withAnonymous(patchHandler, {
  route: "/api/employer/v1/webhooks/[id]",
  reason: "Authenticated by employer service bearer credential.",
});
