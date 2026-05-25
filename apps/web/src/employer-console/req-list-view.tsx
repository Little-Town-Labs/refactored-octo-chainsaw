import Link from "next/link";
import type { JSX } from "react";
import type { EmployerReqTicketRow } from "@spyglass/db";

export function ReqListView({
  rows,
  next_cursor,
}: {
  readonly rows: ReadonlyArray<EmployerReqTicketRow>;
  readonly next_cursor: string | null;
}): JSX.Element {
  return (
    <section aria-labelledby="reqs-heading">
      <h1 id="reqs-heading">Requisitions</h1>
      <Link href="/employer/console/reqs/new">Create req</Link>
      {rows.length === 0 ? (
        <p role="status">No requisitions have been created yet.</p>
      ) : (
        <table>
          <caption>Employer requisitions, newest first.</caption>
          <thead>
            <tr>
              <th scope="col">Identifier</th>
              <th scope="col">Role</th>
              <th scope="col">State</th>
              <th scope="col">Headcount</th>
              <th scope="col">Jurisdictions</th>
              <th scope="col">Threshold</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employer_req_ticket_id}>
                <td>{row.identifier}</td>
                <td>{row.role_title}</td>
                <td>{row.state === "closed" ? "canceled" : row.state}</td>
                <td>
                  {row.headcount_filled}/{row.headcount_total}
                </td>
                <td>{row.jurisdictions.join(", ")}</td>
                <td>{row.threshold}</td>
                <td>
                  <Link href={`/employer/console/reqs/${row.employer_req_ticket_id}`}>Open</Link>{" "}
                  <Link href={`/employer/console/reqs/${row.employer_req_ticket_id}/close`}>
                    Close
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
