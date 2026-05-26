import {
  EMPLOYER_API_SCOPES,
  authenticateEmployerApiRequest,
  type EmployerApiCredentialRepo,
} from "./auth";
import { jsonError, jsonResponse, notFound } from "./errors";
import { webhookEndpointCreateSchema } from "./schemas";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  disableWebhookEndpoint,
  listWebhookEndpoints,
  type WebhookEndpointRepo,
} from "./webhook-endpoints";

export interface WebhookHandlerDeps {
  readonly credentials: EmployerApiCredentialRepo;
  readonly endpoints: WebhookEndpointRepo;
}

export async function handleListWebhookEndpoints(
  request: Request,
  deps: WebhookHandlerDeps,
): Promise<Response> {
  try {
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.webhookRead,
    );
    return jsonResponse({ data: await listWebhookEndpoints(deps.endpoints, principal) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleCreateWebhookEndpoint(
  request: Request,
  deps: WebhookHandlerDeps,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = webhookEndpointCreateSchema.parse(body);
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.webhookWrite,
    );
    return jsonResponse(await createWebhookEndpoint(deps.endpoints, principal, parsed), {
      status: 201,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleDisableWebhookEndpoint(
  request: Request,
  deps: WebhookHandlerDeps,
  endpointId: string,
): Promise<Response> {
  try {
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.webhookWrite,
    );
    const endpoint = await disableWebhookEndpoint(deps.endpoints, principal, endpointId);
    if (!endpoint) throw notFound("Webhook endpoint was not found.");
    return jsonResponse(endpoint);
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleDeleteWebhookEndpoint(
  request: Request,
  deps: WebhookHandlerDeps,
  endpointId: string,
): Promise<Response> {
  try {
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.webhookWrite,
    );
    const endpoint = await deleteWebhookEndpoint(deps.endpoints, principal, endpointId);
    if (!endpoint) throw notFound("Webhook endpoint was not found.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
