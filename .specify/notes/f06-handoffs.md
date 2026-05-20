# F06 Handoffs

**Created:** 2026-05-20
**Source feature:** `006-jurisdiction-policy-gates`
**Purpose:** Capture stable jurisdiction posture, gate-decision,
kill-switch, failure-artifact, and review seams downstream feature
owners should consume after F06.

## F07a/F07b — Contract And Rubric Registries

- Contract and rubric dispatch should call F06 before new jurisdiction
  sensitive workflows run.
- Registry-driven policy changes that affect launch posture should
  create a new jurisdiction policy revision, not mutate an existing row.
- Bias-gate and rubric failures should reuse the F06 pattern: stable
  machine reason codes plus canonical audit links.

## F08 — Parley Runner

- Evaluate jurisdiction gates before run dispatch and before any
  downstream Parley side-runner work.
- Missing or unknown jurisdiction must deny with a persisted
  `jurisdiction_gate_decisions` row and canonical audit evidence.
- F08 should treat `disabled_jurisdiction`, `unsupported_jurisdiction`,
  and `review_required` as terminal dispatch denials, not retryable
  infrastructure failures.

## F10 — Dossier Builder

- Denied jurisdiction gates should be projected through
  `projectFailureArtifact` for dossier/failure surfaces.
- Failure artifacts intentionally omit principal ids, policy revision
  ids, transcript content, job descriptions, resumes, and raw payloads.
- Dossiers should reference the failure artifact id and audit event id,
  then retrieve deeper evidence through F05 evidence export if needed.

## F13/F14 — User And Operator Surfaces

- User-facing states should consume stable reason codes and map them to
  reviewed copy outside the policy-gates package.
- Operator posture review needs `policy.read`; posture mutation needs
  `policy.kill_switch.manage`.
- Operator UI should always show correlation id, policy version, actor,
  and canonical audit event for kill-switch changes.

## F24 — Evidence And Compliance Reporting

- Decision history reads are bounded by subject, jurisdiction, date
  range, and limit through `readDecisionHistory`.
- Compliance exports should include gate decision ids, reason codes,
  policy version, correlation id, audit event id, and kill-switch event
  ids where relevant.
- External review packages should rely on F05 evidence manifests rather
  than ad hoc database dumps.

## Operational Boundaries

- `jurisdiction_policies` are revisioned; do not update posture in
  place except to close an active row with `effective_until`.
- `jurisdiction_gate_decisions` and `jurisdiction_kill_switch_events`
  are immutable evidence rows.
- Re-enabling a jurisdiction is a new kill-switch mutation with a
  closed-list reason such as `manual_reenable`.
