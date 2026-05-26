import type { JSX } from "react";
import type { EmployerApiCredentialRecord } from "../employer-api/auth";
import { EMPLOYER_API_SCOPES } from "../employer-api/auth";
import { issueIntegrationCredentialSubmit } from "./integration-credentials-action";

export function IntegrationCredentialsView({
  credentials,
}: {
  readonly credentials: ReadonlyArray<EmployerApiCredentialRecord>;
}): JSX.Element {
  return (
    <section aria-labelledby="integration-credentials-heading">
      <h1 id="integration-credentials-heading">Integration credentials</h1>
      <form action={issueIntegrationCredentialSubmit}>
        <label>
          Display name
          <input name="display_name" required />
        </label>
        <fieldset>
          <legend>Scopes</legend>
          {Object.values(EMPLOYER_API_SCOPES).map((scope) => (
            <label key={scope}>
              <input name="scopes" type="checkbox" value={scope} /> {scope}
            </label>
          ))}
        </fieldset>
        <button type="submit">Issue credential</button>
      </form>
      {credentials.length === 0 ? (
        <p role="status">No integration credentials have been issued.</p>
      ) : (
        <table>
          <caption>Employer API credentials. Raw secret material is never listed.</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Scopes</th>
              <th scope="col">Expires</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((credential) => (
              <tr key={credential.credential_id}>
                <td>{credential.display_name}</td>
                <td>{credential.status}</td>
                <td>{credential.scopes.join(", ")}</td>
                <td>{credential.expires_at?.toISOString() ?? "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
