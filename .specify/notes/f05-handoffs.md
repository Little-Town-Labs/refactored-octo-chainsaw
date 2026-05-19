# F05 Handoffs

**Created:** 2026-05-19
**Source feature:** `05-audit-log-tombstone`
**Purpose:** Capture the stable audit, transcript, tombstone, and evidence seams downstream feature owners should consume after F05.

## F06 — Jurisdiction Gates + Kill Switches

- Jurisdiction-gate decisions should emit canonical audit events through `@spyglass/audit-log` using `appendCanonicalAuditEvent` or a transactional adapter around `createDrizzleCanonicalAuditWriterTx`.
- Policy-gate denial evidence should include `correlation_id`, principal attribution, gate version, jurisdiction, decision, and a non-PII reason code in the audit payload.
- Geographic kill-switch flips are privileged actions and should use their own chain namespace or a clearly documented event name within the default namespace.

## F07a/F07b — Contract And Rubric Registries

- Transcript turns accept `contract_id`, `contract_version`, `rubric_id`, and `rubric_version`; registry dispatch should populate those fields on every Parley turn.
- Contract/rubric version changes should emit canonical audit events before they are referenced by new runs.
- Evidence exports include chain verification status and tombstone markers; registry review packages should depend on those manifests rather than direct database dumps.

## F08 — Parley Runner

- Use `appendTranscriptTurn` for every side turn. It writes the transcript row and linked `transcript_turn.appended` audit event in one transaction when backed by `createDrizzleTranscriptStore`.
- The stable transcript idempotency key is `(run_id, side, turn_index)`.
- `tool_call_refs`, `model_ref`, contract refs, and rubric refs are the stable metadata fields F08 should populate for later dossier and incident review.

## F10 — Dossier Builder

- Dossiers should reference transcript turns by `transcript_turn_id` and audit packages by manifest hash, not embed raw transcript content as source of truth.
- Tombstoned transcript turns expose `content = null`, `content_hash`, and `tombstoned_at`; dossier rebuilds must tolerate redacted source turns.
- Chain verification should be run before signing evidence-backed dossiers, and the verification result should be carried into the dossier evidence section.

## F24 — Evidence And Compliance Reporting

- Use `createEvidenceExport` for deterministic review manifests. The manifest hash is computed over normalized filters, audit event ids, transcript turn ids, tombstone markers, and chain verification status.
- Allowed export purposes are `incident`, `counsel`, `audit`, and `operator_review`.
- Raw audit reads require `audit.read`; transcript reads require `transcript.read` or `audit.read`; export creation requires `audit.export`.

## Operational Boundaries

- `executeTombstone` requires `audit.tombstone.execute` in `operatorScopes` and emits `tombstone.denied` for denied attempts.
- `createDrizzleTombstoneStore` denies legal-hold checks by default unless a counsel-approved `hasLegalHold` checker is supplied.
- Production tombstone execution remains counsel-review gated; use `docs/runbooks/audit-log-tombstone.md` for intake, execution, verification, and rollback limits.
