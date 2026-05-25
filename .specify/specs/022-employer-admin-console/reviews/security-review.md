# F22 Security Review

## Scope

Employer console pages, server actions, DB schema additions, and org-scoped profile/req/candidate read/write helpers for F22.

## Checks

| Area | Result | Evidence |
| --- | --- | --- |
| Authentication and AAL2 | Pass | `apps/web/proxy.ts` enforces employer audience and AAL2 step-up; `getEmployerConsoleSession` derives employer capabilities from typed principals and fails closed for missing org or wrong tier. |
| Authorization | Pass | Admin-only profile/req mutations are separate from member candidate read capability. Wrong-org and non-employer cases return non-enumerating denial states. |
| Principal coverage | Pass | `bash scripts/check-principal-coverage.sh` reported 20 handler(s) checked, all green. |
| Data isolation | Pass | Profile, req, and candidate reads are organization-scoped; candidate inbox only exposes delivered/projection data. |
| Privacy | Pass | Candidate detail view uses an explicit dossier projection allowlist and prohibited-surface tests block raw transcripts, hidden run state, seeker dashboard, F23 API/webhook, ATS, A2A runtime, disposition mutation, and anonymous mutation surfaces. |
| Input validation | Pass | Server parsers validate required profile fields, req threshold, jurisdictions, decision locus, compensation ordering, headcount, pagination, and close reason. |
| Auditability | Pass | Req mutations reuse existing ticket/state/source workflow audit paths; profile saves persist scoped profile state and emit `employer_organization_profile.saved` audit events. |

## Findings

- No blocking security findings.

## Follow-ups

- Run live browser validation once Clerk employer admin configuration and seeded delivered candidate fixtures are available.
- Re-review F23 separately because API/webhook signing and external integration surfaces are explicitly outside F22.
