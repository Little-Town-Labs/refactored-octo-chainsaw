import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../src/auth/get-principal";
import {
  DrizzleEmployerApiCredentialRepo,
  DrizzleWebhookEndpointRepo,
} from "../../../../../src/employer-api/repos";
import { IntegrationCredentialsView } from "../../../../../src/employer-console/integration-credentials-view";
import { getEmployerConsoleSession } from "../../../../../src/employer-console/session";
import { WebhookEndpointsView } from "../../../../../src/employer-console/webhook-endpoints-view";

export default async function IntegrationsPage() {
  const principal = await getPrincipal();
  const session = getEmployerConsoleSession(principal, "admin");
  const db = getDb();
  const credentials = await new DrizzleEmployerApiCredentialRepo(db).listCredentials(
    session.org_id,
  );
  const endpoints = await new DrizzleWebhookEndpointRepo(db).list(session.org_id);

  return (
    <>
      <IntegrationCredentialsView credentials={credentials} />
      <WebhookEndpointsView endpoints={endpoints} />
    </>
  );
}
