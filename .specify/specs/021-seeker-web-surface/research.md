# Research: Seeker Web Surface

## Decision 1: Keep the seeker web surface account-management only

**Decision**: F21 will implement a public landing surface and Clerk account/profile entry points only. It will not implement a dashboard, ticket list, analytics view, recommended-jobs grid, browse-jobs page, public seeker profile, or custom product state view.

**Rationale**: PRD §3.4 and §5.3 state that the seeker's product is the conversation and the web surface is account management only. F20 owns the product flows across Telegram, email, and web chat.

**Alternatives considered**:

- Add a lightweight dashboard: rejected because the PRD explicitly forbids the pattern.
- Add a read-only match list: rejected because ticket-list UI is also explicitly forbidden.

## Decision 2: Use the existing Next.js web app as the host

**Decision**: F21 will build within `apps/web`, replacing the scaffold home page and public placeholder docs while reusing existing Clerk route groups.

**Rationale**: `apps/web` already hosts the public page, Clerk provider, seeker sign-in/sign-up route group, operator/employer route groups, and public files. Adding a second web host would violate separation and increase deployment complexity.

**Alternatives considered**:

- New static site package: rejected because it would split Clerk and public route ownership.
- Package-only artifact: rejected because F21 is explicitly a web surface.

## Decision 3: Publish A2A cards as discovery artifacts, not runtime handlers

**Decision**: F21 will publish a card index and individual static cards for `seeker-intake`, `employer-intake`, `match-coordinator`, `negotiation-participant`, and `dossier-reader`. Cards include availability and unsupported-action metadata. Runtime protocol handlers remain out of scope.

**Rationale**: PRD §5.3 says A2A endpoints are exposed for future use but not depended on for v0 customer flow. PRD open question #6 lists the candidate card set. Parley notes identify A2A receiver projection as protocol-dependent and downstream of dossier production, so discovery must avoid over-promising live behavior.

**Alternatives considered**:

- Publish only `seeker-intake`: rejected because the PRD asks to confirm the broader candidate set and roadmap says A2A cards plural.
- Implement full A2A runtime: rejected because it belongs to later interop/API work and is not required for v0 customer flow.

## Decision 4: Treat public agent docs as contracts with tests

**Decision**: `/agents.md`, `/llms.txt`, the card index, and individual cards will be covered by tests or contract fixtures that assert required sections, stable paths, and unsupported-action language.

**Rationale**: These files are externally consumed by agents and crawlers; regressions can create compliance and product-boundary drift even if no UI breaks.

**Alternatives considered**:

- Manual documentation only: rejected because the no-dashboard and no-unsupported-A2A claims are roadmap-critical.

## Decision 5: Accessibility evidence is part of the quickstart

**Decision**: F21 quickstart will include responsive and accessibility-oriented checks for landmarks, headings, focus order, link text, and text fit.

**Rationale**: Roadmap Stage 7 gate includes WCAG 2.2 AA verification, and F21 is a public human-facing surface.

**Alternatives considered**:

- Defer accessibility to a later UI pass: rejected because public web surfaces must be accessible from the start.
