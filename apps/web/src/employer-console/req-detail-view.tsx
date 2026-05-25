import type { JSX } from "react";
import type { EmployerReqTicketRow } from "@spyglass/db";

import { ReqForm } from "./req-form";

export function ReqDetailView({ req }: { readonly req: EmployerReqTicketRow }): JSX.Element {
  return (
    <section aria-labelledby="req-detail-heading">
      <h1 id="req-detail-heading">{req.identifier}</h1>
      <dl>
        <dt>State</dt>
        <dd>{req.state === "closed" ? "canceled" : req.state}</dd>
        <dt>Decision locus</dt>
        <dd>{req.decision_locus_jurisdiction}</dd>
      </dl>
      <ReqForm req={req} />
    </section>
  );
}
