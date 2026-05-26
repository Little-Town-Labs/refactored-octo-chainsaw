import { getDb } from "@spyglass/db";
import { drizzleSequenceExecutor, nextIdentifier } from "@spyglass/tickets";

import {
  DrizzleEmployerApiCredentialRepo,
  DrizzleEmployerReqApiRepo,
  DrizzleIdempotencyRepo,
  DrizzleWebhookEndpointRepo,
  noopEmployerReqAuditSink,
} from "./repos";
import type { EmployerReqHandlerDeps } from "./req-handlers";
import type { WebhookHandlerDeps } from "./webhook-handlers";

export function createEmployerReqRouteDeps(): EmployerReqHandlerDeps {
  const db = getDb();
  return {
    credentials: new DrizzleEmployerApiCredentialRepo(db),
    idempotency: new DrizzleIdempotencyRepo(db),
    reqs: new DrizzleEmployerReqApiRepo(db, () =>
      nextIdentifier({
        kind: "employer_req_ticket",
        executor: drizzleSequenceExecutor(db),
      }),
    ),
    audit: noopEmployerReqAuditSink,
  };
}

export function createWebhookRouteDeps(): WebhookHandlerDeps {
  const db = getDb();
  return {
    credentials: new DrizzleEmployerApiCredentialRepo(db),
    endpoints: new DrizzleWebhookEndpointRepo(db),
  };
}
