import type { JSX } from "react";

import { EmployerConsoleFeedback } from "./feedback";
import type { CandidateInboxEntry } from "./types";

const ALLOWED_PAYLOAD_FIELDS = ["summary", "strengths", "risks_or_gaps", "rubric_refs"] as const;

export function candidateDossierProjectionPayload(
  payload: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!payload) return {};
  return Object.fromEntries(
    ALLOWED_PAYLOAD_FIELDS.flatMap((field) =>
      Object.hasOwn(payload, field) ? [[field, payload[field]]] : [],
    ),
  );
}

export function CandidateDetailView({
  entry,
}: {
  readonly entry: CandidateInboxEntry;
}): JSX.Element {
  const payload = candidateDossierProjectionPayload(entry.projection?.payload ?? null);
  return (
    <section aria-labelledby="candidate-detail-heading">
      <h1 id="candidate-detail-heading">{entry.match.identifier}</h1>
      <dl>
        <dt>Req</dt>
        <dd>{entry.employer_req.identifier}</dd>
        <dt>Signature</dt>
        <dd>
          {entry.signature ? `${entry.signature.algorithm} ${entry.signature.kid}` : "unavailable"}
        </dd>
      </dl>
      {!entry.signature ? (
        <EmployerConsoleFeedback kind="warning" title="Signature unavailable">
          <p>This dossier cannot be treated as signed until signature metadata is available.</p>
        </EmployerConsoleFeedback>
      ) : null}
      {Object.keys(payload).length === 0 ? (
        <p role="status">No approved employer dossier projection is available.</p>
      ) : (
        <section aria-labelledby="projection-heading">
          <h2 id="projection-heading">Approved dossier projection</h2>
          <dl>
            {Object.entries(payload).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}
