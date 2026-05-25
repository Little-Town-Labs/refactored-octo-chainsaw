# Implementation Plan: Employer Admin Console

**Branch**: `022-employer-admin-console` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/022-employer-admin-console/spec.md`

## Summary

F22 adds the first employer-side human console: a thin, organization-scoped, Clerk/AAL2-gated UI for company profile, req creation/management, candidate inbox, and dossier projection review. The implementation will reuse the existing `apps/web` Next.js App Router, existing employer route group, existing principal/auth helpers, existing ticket store/server-action primitives, and operator-console accessibility patterns. F23 remains responsible for REST APIs, signed webhooks, and external integration.

## Technical Context

**Language/Version**: TypeScript strict, React 19, Next.js 16 App Router.

**Primary Dependencies**: `@clerk/nextjs`, `@spyglass/auth`, `@spyglass/db`, `@spyglass/tickets`, existing web server actions and console view patterns.

**Storage**: Neon Postgres via Drizzle. Reuse existing organizations, principals, employer req tickets, match tickets, dossiers, and audit buffers. Add a minimal `employer_organization_profiles` table unless implementation proves an existing durable profile table already provides all F22 profile fields without mutating Clerk-mirror `organizations` rows.

**Testing**: Jest + React Testing Library for views/actions/parsers; workspace `pnpm` scripts; principal coverage shell gate; Next build.

**Target Platform**: Vercel-hosted Next.js web app.

**Project Type**: Brownfield web application inside existing monorepo.

**Performance Goals**: Console list pages render first page from bounded queries; list pagination remains bounded at 50 rows by default and 100 max where existing read repos support it.

**Constraints**: Employer admin and operator surfaces require AAL2; all mutations require typed principal path; no anonymous mutating handlers; no ATS/API/webhook/A2A-runtime behavior; no seeker dashboard. WCAG 2.2 AA smoke evidence required.

**Scale/Scope**: One employer console route family, four user stories, org-scoped profile/req/candidate flows, no external API contracts.

## Constitution Check

| Article | Status | F22 posture |
| --- | --- | --- |
| I.1 Confidentiality | PASS | Candidate inbox shows approved employer-side dossier projections only; no raw transcripts or seeker-private negotiation posture. |
| I.2 Integrity | PASS | Req transitions and close actions reuse ticket state machines and audit events; signed dossier metadata is visible. |
| I.3 Availability | PASS | Jurisdiction gate failures and missing dossier/signature states render explicit failure states instead of silent passes. |
| I.4 Privacy | PASS | F22 adds only employer-side profile/req/candidate UI; no new seeker personal-data collection. |
| I.5 AAA | PASS | Clerk org principal + AAL2 gates; admin/member capability split; principal-coverage gate required. |
| I.6 Defense in Depth | PASS | RSC pages and server actions still call `getPrincipal()` / role guards even when proxy gates route groups. |
| II Agent-Native | PASS | Human UI exposes semantically clear req/dossier states without becoming the reference API; F23 owns external contracts. |
| III Human UI | PASS | F22 follows operator-console low-chrome, landmark, form, table, dialog, and error-summary patterns. |
| IV Separation of Concerns | PASS | F22 stays in `apps/web` UI/action layer and reuses `@spyglass/tickets`; API/webhook work remains F23. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/022-employer-admin-console/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── server-actions.contract.md
│   └── ui-routes.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/
├── app/(employer)/
│   ├── layout.tsx
│   ├── employer/console/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── profile/page.tsx
│   │   ├── reqs/page.tsx
│   │   ├── reqs/new/page.tsx
│   │   ├── reqs/[id]/page.tsx
│   │   ├── reqs/[id]/close/page.tsx
│   │   ├── candidates/page.tsx
│   │   └── candidates/[id]/page.tsx
│   ├── sign-in/[[...rest]]/page.tsx
│   └── sign-up/[[...rest]]/page.tsx
├── src/employer-console/
│   ├── __tests__/
│   ├── employer-console-layout.tsx
│   ├── employer-profile-view.tsx
│   ├── employer-profile-action.ts
│   ├── req-list-view.tsx
│   ├── req-form.tsx
│   ├── req-actions.ts
│   ├── candidate-inbox-view.tsx
│   ├── candidate-detail-view.tsx
│   ├── repos.ts
│   └── parse-*.ts
└── src/tickets/actions/
    ├── submit-employer.ts
    └── amend-employer.ts

packages/tickets/
└── src/repo/
    ├── employer-req.ts
    └── read.ts
```

**Structure Decision**: Implement F22 as an `apps/web` route family and component/action module, reusing existing ticket repositories. Add package-level ticket helpers only if current read/write primitives cannot support org-scoped console workflows.

## Phase 0: Research

Completed in [research.md](./research.md).

## Phase 1: Design & Contracts

Completed artifacts:

- [data-model.md](./data-model.md)
- [contracts/ui-routes.contract.md](./contracts/ui-routes.contract.md)
- [contracts/server-actions.contract.md](./contracts/server-actions.contract.md)
- [quickstart.md](./quickstart.md)

## Constitution Check (Post-Design)

No constitutional or structural violations require complexity exceptions. The design keeps employer UI thin, org-scoped, AAL2-gated, auditable, and separate from F23 integrations. Because F22 touches Article I controls and Article II semantics, implementation closure requires a STRIDE/LINDDUN threat model and `/security-review` artifact before PR publication.

## Complexity Tracking

No violations.
