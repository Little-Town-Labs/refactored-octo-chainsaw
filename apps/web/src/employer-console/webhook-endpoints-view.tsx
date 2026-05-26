import type { JSX } from "react";
import type { WebhookEndpointResource } from "../employer-api/webhook-endpoints";

export function WebhookEndpointsView({
  endpoints,
}: {
  readonly endpoints: ReadonlyArray<WebhookEndpointResource>;
}): JSX.Element {
  return (
    <section aria-labelledby="webhook-endpoints-heading">
      <h2 id="webhook-endpoints-heading">Webhook endpoints</h2>
      {endpoints.length === 0 ? (
        <p role="status">No webhook endpoints have been registered.</p>
      ) : (
        <table>
          <caption>Registered webhook endpoints and subscribed event types.</caption>
          <thead>
            <tr>
              <th scope="col">URL</th>
              <th scope="col">Status</th>
              <th scope="col">Events</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint) => (
              <tr key={endpoint.webhook_endpoint_id}>
                <td>{endpoint.url}</td>
                <td>{endpoint.status}</td>
                <td>{endpoint.subscribed_events.join(", ")}</td>
                <td>{endpoint.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
