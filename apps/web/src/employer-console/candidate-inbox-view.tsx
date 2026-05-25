import Link from "next/link";
import type { JSX } from "react";

import type { CandidateInboxEntry } from "./types";

export function CandidateInboxView({
  rows,
  next_cursor,
}: {
  readonly rows: ReadonlyArray<CandidateInboxEntry>;
  readonly next_cursor: string | null;
}): JSX.Element {
  return (
    <section aria-labelledby="candidate-inbox-heading">
      <h1 id="candidate-inbox-heading">Candidate inbox</h1>
      {rows.length === 0 ? (
        <p role="status">No delivered candidates are available yet.</p>
      ) : (
        <table>
          <caption>Delivered candidate dossiers by req.</caption>
          <thead>
            <tr>
              <th scope="col">Match</th>
              <th scope="col">Req</th>
              <th scope="col">State</th>
              <th scope="col">Delivered</th>
              <th scope="col">Signature</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.match.match_ticket_id}>
                <td>{entry.match.identifier}</td>
                <td>{entry.employer_req.identifier}</td>
                <td>{entry.match.state}</td>
                <td>
                  <time dateTime={entry.match.updated_at.toISOString()}>
                    {entry.match.updated_at.toISOString()}
                  </time>
                </td>
                <td>{entry.signature ? "signed" : "unavailable"}</td>
                <td>
                  <Link href={`/employer/console/candidates/${entry.match.match_ticket_id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {next_cursor ? (
        <nav aria-label="Pagination">
          <Link href={`?cursor=${encodeURIComponent(next_cursor)}`} rel="next">
            Next page
          </Link>
        </nav>
      ) : null}
    </section>
  );
}
