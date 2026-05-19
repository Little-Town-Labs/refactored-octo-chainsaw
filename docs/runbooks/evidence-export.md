# Runbook — Evidence Export

**Owner:** F05 (Audit log + transcript store + tombstone) · **Version:** 1.0 · **Date:** 2026-05-19

This runbook covers scoped audit and transcript evidence exports for
operator review, counsel review, incident response, and audit packages.
It applies to the F05 `evidence_exports` manifest table and the
`@spyglass/audit-log` evidence read/export primitives.

Related code:

- Evidence primitives: `packages/audit-log/src/export.ts`
- Hash-chain verifier: `packages/audit-log/src/hash-chain.ts`
- Tombstone procedure: `packages/audit-log/src/tombstone.ts`
- Export manifest schema: `packages/db/src/schema/audit-log.ts`

## 1. Allowed Purposes

`evidence_exports.purpose` is a closed set:

| Purpose | Allowed use | Required reviewer |
| --- | --- | --- |
| `incident` | Security, integrity, or production incident investigation | Incident lead |
| `counsel` | Legal review, erasure request review, regulatory inquiry | Counsel or delegated privacy owner |
| `audit` | Scheduled compliance, SOC 2, or bias-audit evidence package | Compliance owner |
| `operator_review` | Narrow operational diagnosis where raw evidence is required | Operator lead |

Do not create an evidence export for product analytics, debugging that
can be handled with aggregate logs, or convenience access to raw
transcripts.

## 2. Authorization

Reads and exports are deny-by-default.

- Audit evidence reads require `audit.read`.
- Transcript evidence reads require `transcript.read` or `audit.read`.
- Evidence export creation requires `audit.export`.

The requester must have a principal id and a recorded business purpose.
For counsel and audit exports, link the export to the counsel or
compliance ticket before sharing results.

## 3. Filter Selection

Use the narrowest filter set that satisfies the request. Supported
filters:

- `matchTicketId`
- `runId`
- `principalId`
- `correlationId`
- `from`
- `to`

Prefer exact ids over date ranges. Date ranges should be bounded on both
sides unless counsel or an incident lead approves a broader scan.

Example server-side use:

```ts
import { createDrizzleEvidenceStore, createEvidenceExport } from "@spyglass/audit-log";

const manifest = await createEvidenceExport(
  createDrizzleEvidenceStore(db),
  {
    requestedByPrincipalId: "<requester_principal_uuid>",
    purpose: "counsel",
    filters: { principalId: "<subject_principal_uuid>" },
    chainVerificationStatus: "valid",
  },
  { scopes: ["audit.export"] },
);
```

## 4. Verification

Before sharing an export package:

1. Run hash-chain verification for the included audit chain namespace.
2. Confirm `chain_verification_status` is `valid`, or document the first
   invalid event id if not.
3. Confirm the manifest includes all matching audit event ids and
   transcript turn ids.
4. Confirm tombstoned records appear only as tombstone markers and do not
   expose raw redacted content.
5. Save the manifest hash and export id to the review ticket.

Local gates:

```bash
pnpm --filter @spyglass/audit-log test -- export.test.ts hash-chain.test.ts
pnpm --filter @spyglass/audit-log type-check
pnpm schema:lint
```

## 5. Handling Results

The relational `evidence_exports` row is a manifest, not a raw evidence
archive. If an export package includes copied rows or files:

- Store it only in the approved evidence location for the ticket.
- Preserve the manifest hash with the package.
- Do not email raw transcripts or audit payloads.
- Redact unrelated subjects before sharing outside the response group.
- Apply the retention horizon for `evidence_export` in
  `docs/data-governance/retention-policy.md`.

## 6. Denials

Deny export requests when:

- The requester lacks the required scope.
- The purpose is outside the allowed set.
- The filter is broader than necessary.
- The export would reveal data under legal hold constraints that counsel
  has not approved for this request.
- The request is for raw transcript inspection without an audit,
  incident, counsel, or operator-review need.

Record denied requests in the originating ticket. Do not create an
`evidence_exports` manifest for denied requests.
