# F22 Threat Model: Employer Admin Console

## Scope

F22 adds authenticated employer UI for organization profile management, req management, and read-only candidate dossier review at `/employer/console/*`. F23 APIs, signed webhooks, ATS connectors, A2A runtime handlers, seeker dashboard routes, and candidate disposition mutation remain out of scope.

## Assets

- Employer organization profile fields used by the employer advocate.
- Employer req source fields, state, threshold, jurisdictions, and decision locus.
- Candidate inbox entries and approved employer-side dossier projections.
- Principal, active organization, AAL posture, and admin/member capability state.
- Audit events emitted through existing ticket/source workflows and profile saves.

## STRIDE

| Threat | Risk | F22 control | Residual |
| --- | --- | --- | --- |
| Spoofing | A non-employer or wrong organization user renders employer data. | `apps/web/proxy.ts` enforces employer audience and AAL2; pages/actions still derive access from `getPrincipal()` and `getEmployerConsoleSession`; missing org and non-employer states fail closed. | Depends on Clerk organization materialization from F02. |
| Tampering | Admin submits malformed req/profile fields or edits terminal reqs. | Server-side parsers validate required fields, threshold bounds, compensation ordering, headcount, jurisdictions, and close reasons; req mutations reuse ticket state/source workflow helpers. | Browser-only validation is not trusted. |
| Repudiation | Profile/req mutations lack evidence. | Req create/amend/close use existing ticket audit paths; profile repo accepts audit metadata and records last update. | Profile audit is scoped to profile persistence, not a new external ledger. |
| Information disclosure | Candidate detail leaks raw transcript, hidden run state, private notes, or score internals. | Candidate detail uses an explicit employer dossier projection allowlist and tests assert prohibited strings/fields are absent. | Future dossier schema additions must update the allowlist intentionally. |
| Denial of service | Large list queries degrade console routes. | Pagination parsers cap page size and repos use bounded limits. | Database-level rate limiting remains a platform concern. |
| Elevation of privilege | Employer member performs admin mutations. | Capability split allows members to read candidate surfaces while profile/req mutations require `manage_profile` / `manage_reqs`. | Additional member roles require new tests before enablement. |

## LINDDUN

| Threat | Risk | F22 control | Residual |
| --- | --- | --- | --- |
| Linkability | Candidate rows could expose cross-org or in-progress match activity. | Candidate reads are org-scoped and delivered/projection-only. | Live seeded data validation is deferred until a Clerk employer session is available. |
| Identifiability | Dossier views may reveal seeker-private internals. | Views render only approved employer projection fields and signature metadata. | Candidate label/source quality depends on upstream dossier builder. |
| Non-repudiation | Human actions need accountability. | Mutating actions require authenticated typed principals and reject anonymous flows through principal coverage. | Operator review of audit exports remains outside F22. |
| Detectability | Error messages reveal whether another org's req/candidate exists. | Authorization and missing data use non-enumerating feedback. | Detailed operational logs must remain access controlled. |
| Disclosure | Profile/req forms could include ATS secrets or billing data. | F22 schema and forms intentionally omit ATS admin, webhook, API token, billing, and disposition surfaces. | F23 must keep integration credentials separate. |
| Unawareness | Users misunderstand signed dossier validity. | Candidate detail displays valid/unavailable/invalid signature states instead of silently accepting unsigned dossiers. | Full verifier UX can be expanded after F23 delivery. |
| Non-compliance | Employer admin UI misses AAL2/accessibility obligations. | F02 proxy AAL2 gating covers employer routes; render tests, build evidence, and accessibility review artifact are recorded before PR. | Manual assistive-tech validation remains a release-readiness follow-up when live config is available. |

## Release Gate

No blocking F22 threat remains open for PR publication. The browser-only Clerk validation blocker is recorded in quickstart evidence and does not weaken server-side authorization or render/action test coverage.
