import type { JSX } from "react";
import type { EmployerReqTicketRow } from "@spyglass/db";

import { closeEmployerReqSubmit } from "./req-actions";

export function ReqCloseView({ req }: { readonly req: EmployerReqTicketRow }): JSX.Element {
  return (
    <section aria-labelledby="req-close-heading">
      <h1 id="req-close-heading">Close {req.identifier}</h1>
      <p>This action stops further active candidate presentation for this req.</p>
      <form action={closeEmployerReqSubmit}>
        <input type="hidden" name="employer_req_ticket_id" value={req.employer_req_ticket_id} />
        <fieldset>
          <legend>Terminal outcome</legend>
          <label>
            <input type="radio" name="terminal_state" value="filled" defaultChecked /> Filled
          </label>
          <label>
            <input type="radio" name="terminal_state" value="closed" /> Canceled
          </label>
        </fieldset>
        <label htmlFor="reason_code">Reason code</label>
        <input id="reason_code" name="reason_code" required />
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" />
        <button type="submit">Confirm close</button>
      </form>
    </section>
  );
}
