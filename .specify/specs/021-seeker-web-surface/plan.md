# Implementation Plan: Seeker Web Surface

**Branch**: `021-seeker-web-surface` | **Date**: 2026-05-25 | **Spec**: `.specify/specs/021-seeker-web-surface/spec.md`

**Input**: Feature specification from `.specify/specs/021-seeker-web-surface/spec.md`

## Summary

F21 replaces the scaffold public web entry with the seeker-facing account-management web surface and publishes agent-readable discovery artifacts. The implementation will use the existing `apps/web` Next.js app, existing Clerk route groups, existing public `agents.md` and `llms.txt` placeholders, and the minimal `@spyglass/a2a` package for typed card data. F21 is deliberately not a seeker product dashboard: it exposes landing, Clerk account/profile links, public docs, and A2A discovery cards only.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, React 19, Next.js 16 App Router.

**Primary Dependencies**: `@spyglass/web`, `@spyglass/a2a`, `@clerk/nextjs`, React, Next.js, Jest, Testing Library, TypeScript, ESLint, Prettier.

**Storage**: No new durable storage. F21 serves public/static content, route handlers, typed card constants, and links into existing Clerk account surfaces.

**Testing**: Jest and Testing Library for landing/content contracts, route handler/card contract tests, public docs content tests, no-dashboard guard tests, TypeScript type-check, ESLint, Next build, and quickstart/browser evidence.

**Target Platform**: Spyglass web app running in the existing pnpm/Turborepo monorepo and Vercel-compatible Next.js deployment.

**Project Type**: Web application plus a small shared A2A card-definition package.

**Performance Goals**: Public landing and discovery routes should render from static or deterministic data with no database dependency. Public docs and cards should be cacheable and return without authenticated session lookup.

**Constraints**: No seeker dashboard, ticket list, analytics view, recommended-jobs UI, browse-jobs UI, public seeker profile, raw dossier/transcript view, hidden run state, direct employer messaging, or runtime A2A protocol handler. A2A cards are published for discovery/future interop and are not depended on for v0 customer flow.

**Scale/Scope**: One public landing page, public docs, A2A card data, A2A well-known route handlers, no-dashboard route/content guards, tests, quickstart evidence, and roadmap/pointer updates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F21 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Public routes expose only marketing/discovery content; no private ticket, dossier, transcript, hidden run, or score data. |
| I.2 Integrity | PASS | Public A2A cards and docs are contract-tested for stable IDs, paths, and unsupported-action claims. |
| I.3 Availability | PASS | Public landing/docs/cards avoid database dependencies and can be cached. |
| I.4 Privacy | PASS | No new personal-data storage is introduced; Clerk remains account/profile owner. |
| I.5 AAA | PASS | Mutating/account actions remain under Clerk. Public discovery routes are intentionally anonymous and read-only. |
| I.6 Fail-safe Defaults | PASS | Prohibited product-like paths do not render dashboard content; unknown cards fail closed. |
| II Agent-Native Architecture | PASS | F21 publishes agent-readable docs and A2A cards as first-class public artifacts. |
| III.1 Human UI | PASS | Public surface is limited, accessible, and explicitly avoids SaaS dashboard drift. |
| III.2 Typed Semantics | PASS | A2A card/index contracts define stable fields and availability semantics. |
| IV Separation of Concerns | PASS | Landing/docs/cards stay separate from F20 conversation flows and F23 employer API/webhooks. |
| V.3 Review Process | PASS | Tasks include analyze/review/security-accessibility review, quickstart evidence, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/021-seeker-web-surface/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── a2a-card.schema.yaml
│   ├── a2a-card-index.schema.yaml
│   └── public-docs.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── page.tsx
│   ├── not-found.tsx
│   └── .well-known/a2a/
│       ├── index.json/route.ts
│       └── [card]/route.ts
├── public/
│   ├── agents.md
│   └── llms.txt
└── src/
    └── seeker-web/
        ├── a2a-card-routes.ts
        ├── a2a-cards.ts
        ├── landing-content.ts
        ├── no-dashboard-guard.ts
        └── __tests__/
            ├── a2a-cards.test.ts
            ├── a2a-card-routes.test.ts
            ├── landing-content.test.ts
            ├── landing-page.test.tsx
            ├── no-dashboard-guard.test.ts
            └── public-docs.test.ts

packages/a2a/
└── src/
    └── index.ts
```

**Structure Decision**: Implement human-facing rendering and route handlers in `apps/web`, with reusable card types/constants in `@spyglass/a2a` if needed. Do not create a new app, database schema, provider integration, or runtime A2A server.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/021-seeker-web-surface/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/021-seeker-web-surface/data-model.md`
- `.specify/specs/021-seeker-web-surface/quickstart.md`
- `.specify/specs/021-seeker-web-surface/contracts/a2a-card.schema.yaml`
- `.specify/specs/021-seeker-web-surface/contracts/a2a-card-index.schema.yaml`
- `.specify/specs/021-seeker-web-surface/contracts/public-docs.contract.md`

## Phase 2: Implementation Approach

1. Update active Spec Kit pointers to F21.
2. Add typed A2A card/index definitions and validation helpers.
3. Replace public landing scaffold with an accessible seeker landing surface.
4. Replace `/agents.md` and `/llms.txt` placeholders with final F21 public docs.
5. Add well-known A2A card index and individual card route handlers.
6. Add no-dashboard route/content guard tests and not-found handling for prohibited surfaces.
7. Add Jest/Testing Library coverage for landing, docs, cards, and prohibited links.
8. Run package and workspace validation, capture quickstart evidence, analyze/review, update roadmap, and publish PR.

## Risk Controls

- Dashboard drift risk: no-dashboard guard tests assert prohibited paths, labels, and links are absent.
- A2A over-promise risk: cards use `discovery-only` / `handler-deferred` statuses unless runtime handlers exist.
- Privacy leak risk: public content is static/deterministic and excludes ticket, dossier, transcript, score, and hidden-run data.
- Accessibility risk: landing tests and quickstart evidence include landmarks, headings, focusable links, responsive text fit, and keyboard navigation.
- Scope creep risk: F20 remains conversation product, F23 remains employer API/webhooks, F25 remains launch posture.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
