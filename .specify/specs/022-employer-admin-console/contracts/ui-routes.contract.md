# UI Routes Contract: Employer Admin Console

## Route Family

All F22 routes are under the employer route group and require an authenticated employer principal with AAL2 unless noted otherwise.

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/employer/console` | Console landing; redirects or links to req list | Employer admin/member |
| `/employer/console/profile` | Organization profile view/edit | Employer admin for edit; member read optional |
| `/employer/console/reqs` | Organization req list | Employer admin/member |
| `/employer/console/reqs/new` | Create req form | Employer admin |
| `/employer/console/reqs/[id]` | Req detail and allowed amendments | Employer admin/member; admin for mutation |
| `/employer/console/reqs/[id]/close` | Close req confirmation | Employer admin |
| `/employer/console/candidates` | Candidate inbox | Employer admin/member |
| `/employer/console/candidates/[id]` | Candidate dossier projection detail | Employer admin/member |

## Required Page States

- Loading or pending states for server-action submissions.
- Empty profile, empty req list, and empty candidate inbox states.
- Validation error summaries linked to invalid fields.
- Authorization denial through existing route/auth gates; no custom account-enumerating copy.
- Stale or malformed cursor fallback for list routes.

## Out of Scope

- REST API endpoints.
- Signed webhook registration or delivery.
- ATS connector configuration.
- A2A runtime protocol handlers.
- Candidate disposition mutation.
- Seeker-facing dashboard, jobs, matches, or analytics pages.
