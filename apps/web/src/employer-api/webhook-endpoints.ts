import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { unprocessable } from "./errors";
import type { EmployerApiPrincipal } from "./auth";
import type { WebhookEndpointCreateInput } from "./schemas";

export interface WebhookEndpointResource {
  readonly webhook_endpoint_id: string;
  readonly org_id: string;
  readonly url: string;
  readonly description?: string;
  readonly subscribed_events: readonly string[];
  readonly status: "active" | "disabled" | "deleted";
  readonly created_at: string;
}

export interface WebhookEndpointRepo {
  create(
    orgId: string,
    input: WebhookEndpointCreateInput,
    actor: EmployerApiPrincipal,
  ): Promise<WebhookEndpointResource>;
  list(orgId: string): Promise<readonly WebhookEndpointResource[]>;
  updateStatus(
    orgId: string,
    endpointId: string,
    status: "disabled" | "deleted",
    actor: EmployerApiPrincipal,
  ): Promise<WebhookEndpointResource | null>;
}

export function validateWebhookUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:") {
    throw unprocessable("Webhook endpoint URL must use HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw unprocessable("Webhook endpoint URL must not include credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw unprocessable("Webhook endpoint URL must not target localhost.");
  }

  if (isBlockedIpLiteral(hostname)) {
    throw unprocessable("Webhook endpoint URL must not target private or link-local addresses.");
  }

  return parsed;
}

export function redirectPolicyForWebhookEndpoint(): "manual" {
  return "manual";
}

export async function createWebhookEndpoint(
  repo: WebhookEndpointRepo,
  principal: EmployerApiPrincipal,
  input: WebhookEndpointCreateInput,
): Promise<WebhookEndpointResource> {
  validateWebhookUrl(input.url);
  return repo.create(principal.org_id, input, principal);
}

export async function listWebhookEndpoints(
  repo: WebhookEndpointRepo,
  principal: EmployerApiPrincipal,
): Promise<readonly WebhookEndpointResource[]> {
  return repo.list(principal.org_id);
}

export async function disableWebhookEndpoint(
  repo: WebhookEndpointRepo,
  principal: EmployerApiPrincipal,
  endpointId: string,
): Promise<WebhookEndpointResource | null> {
  return repo.updateStatus(principal.org_id, endpointId, "disabled", principal);
}

export async function deleteWebhookEndpoint(
  repo: WebhookEndpointRepo,
  principal: EmployerApiPrincipal,
  endpointId: string,
): Promise<WebhookEndpointResource | null> {
  return repo.updateStatus(principal.org_id, endpointId, "deleted", principal);
}

export function endpointUrlFingerprint(url: string): string {
  return `sha256:${createHash("sha256").update(url, "utf8").digest("hex")}`;
}

function isBlockedIpLiteral(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, "").replace(/\]$/, "");
  const family = isIP(normalized);
  if (family === 0) {
    return false;
  }

  if (family === 4) {
    const [firstRaw, secondRaw] = normalized.split(".");
    const first = Number(firstRaw);
    const second = Number(secondRaw);
    return (
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254) ||
      first === 0
    );
  }

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.toLowerCase().startsWith("fc") ||
    normalized.toLowerCase().startsWith("fd") ||
    normalized.toLowerCase().startsWith("fe80:")
  );
}
