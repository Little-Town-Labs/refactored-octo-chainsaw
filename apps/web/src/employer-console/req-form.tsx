import type { JSX } from "react";

import { amendEmployerReqSubmit, createEmployerReqSubmit } from "./req-actions";
import type { EmployerReqTicketRow } from "@spyglass/db";
import { FieldErrors } from "./feedback";

const ROLE_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "manager",
  "director",
  "vp",
  "exec",
];
const WORK_MODES = ["remote", "hybrid", "onsite"];

export function ReqForm({
  req,
  errors,
}: {
  readonly req?: EmployerReqTicketRow;
  readonly errors?: Record<string, string[]>;
}): JSX.Element {
  const action = req ? amendEmployerReqSubmit : createEmployerReqSubmit;
  return (
    <form action={action} aria-labelledby="req-form-heading">
      <h2 id="req-form-heading">{req ? "Update req" : "Create req"}</h2>
      {errors ? <FieldErrors errors={errors} /> : null}
      {req ? (
        <input type="hidden" name="employer_req_ticket_id" value={req.employer_req_ticket_id} />
      ) : null}
      <label htmlFor="role_title">Role title</label>
      <input id="role_title" name="role_title" defaultValue={req?.role_title ?? ""} required />
      <label htmlFor="role_level">Role level</label>
      <select id="role_level" name="role_level" defaultValue={req?.role_level ?? "senior"}>
        {ROLE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      <label htmlFor="comp_band_min">Compensation minimum</label>
      <input
        id="comp_band_min"
        name="comp_band_min"
        type="number"
        defaultValue={req?.comp_band_min ?? 0}
      />
      <label htmlFor="comp_band_max">Compensation maximum</label>
      <input
        id="comp_band_max"
        name="comp_band_max"
        type="number"
        defaultValue={req?.comp_band_max ?? 0}
      />
      <label htmlFor="currency">Currency</label>
      <input
        id="currency"
        name="currency"
        defaultValue={req?.currency ?? "USD"}
        pattern="[A-Z]{3}"
      />
      <label htmlFor="jurisdictions">Hiring jurisdictions</label>
      <input
        id="jurisdictions"
        name="jurisdictions"
        defaultValue={req?.jurisdictions.join(",") ?? ""}
        required
      />
      <label htmlFor="decision_locus_jurisdiction">Decision locus</label>
      <input
        id="decision_locus_jurisdiction"
        name="decision_locus_jurisdiction"
        defaultValue={req?.decision_locus_jurisdiction ?? ""}
        required
      />
      <label htmlFor="work_mode">Work mode</label>
      <select id="work_mode" name="work_mode" defaultValue={req?.work_mode ?? "remote"}>
        {WORK_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
      <label htmlFor="headcount_total">Headcount</label>
      <input
        id="headcount_total"
        name="headcount_total"
        type="number"
        min="1"
        defaultValue={req?.headcount_total ?? 1}
      />
      <label htmlFor="threshold">Matching threshold</label>
      <input
        id="threshold"
        name="threshold"
        type="number"
        min="0"
        max="100"
        defaultValue={req?.threshold ?? 75}
      />
      <label htmlFor="flags">Flags</label>
      <input id="flags" name="flags" defaultValue={req?.flags.join(",") ?? ""} />
      <button type="submit">{req ? "Update req" : "Create req"}</button>
    </form>
  );
}
