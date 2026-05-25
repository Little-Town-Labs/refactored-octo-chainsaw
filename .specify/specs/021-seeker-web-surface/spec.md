# Feature Specification: Seeker Web Surface

**Feature Branch**: `021-seeker-web-surface`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "F21 Seeker web surface / `21-seeker-web-surface`: start the Spec Kit specify -> clarify/plan/tasks flow after reading PRD §3.4, §5.3, §6.1 and Parley A2A/publication notes. Build the seeker-side web surface for landing, Clerk account/profile entry points, agent-readable `agents.md` and `llms.txt`, and A2A agent-card publication. Preserve the PRD no-dashboard boundary: no seeker dashboard, ticket list, analytics UI, recommended-jobs UI, or product-shaped web surface. A2A cards are published for discovery and future interop, not depended on for v0 customer flow."

## Clarifications

### Session 2026-05-25

- Q: Does F21 add a seeker dashboard, ticket list, analytics view, recommended-jobs UI, or job-browsing surface? -> A: No. F21 is limited to public landing, account/profile entry points, agent-readable docs, and A2A discovery cards; the seeker product remains conversation-first.
- Q: Which A2A cards should F21 publish for the PRD open question #6 candidate set? -> A: Publish static discovery cards for `seeker-intake`, `employer-intake`, `match-coordinator`, `negotiation-participant`, and `dossier-reader`, with availability and unsupported-action metadata; runtime protocol handlers remain out of scope.
- Q: Do F21 pages own Clerk profile data persistence or the conversational product flows? -> A: No. F21 links to Clerk-hosted signup/login and a seeker account/profile entry point backed by Clerk components or Clerk-hosted account management; F20 remains the conversational product layer and Clerk remains the account/profile system of record.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand Spyglass and Start Account Setup (Priority: P1)

A seeker or human visitor can land on the public site, understand that Spyglass is a conversation-first hiring advocate, choose a supported onboarding path, and reach Clerk signup/login/profile entry points without being offered a dashboard or job-browsing product.

**Why this priority**: The landing surface is the first web touchpoint for seekers and agents. It must communicate the product boundary clearly while allowing account setup to begin.

**Independent Test**: Can be tested by rendering the landing page at desktop and mobile widths, checking primary calls to action, verifying Clerk entry links, and proving prohibited dashboard-like navigation does not exist.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they open the landing page, **Then** they see Spyglass positioning, supported seeker channels, and signup/login/profile entry points without dashboard, ticket-list, analytics, recommended-jobs, or browse-jobs links.
2. **Given** a returning seeker, **When** they choose account/profile management, **Then** they are directed to Clerk-owned account/profile surfaces rather than a custom product dashboard.
3. **Given** a visitor uses keyboard or assistive technology, **When** they navigate the landing surface, **Then** headings, landmarks, links, and focus order support WCAG 2.2 AA expectations.

---

### User Story 2 - Publish Agent-Readable Site Instructions (Priority: P2)

An autonomous browsing agent can fetch agent-readable instructions that explain what Spyglass is, how a seeker onboards, where public A2A cards live, what is not available, and what content is not authorized for scraping or model-training reuse.

**Why this priority**: The roadmap requires dual-audience surfaces for humans and agents. Clear `agents.md` and `llms.txt` prevent ambiguity while keeping the v0 web surface intentionally small.

**Independent Test**: Can be tested by fetching `/agents.md` and `/llms.txt`, checking stable content sections and links, and verifying they do not advertise unsupported seeker APIs or dashboards.

**Acceptance Scenarios**:

1. **Given** an agent requests `/agents.md`, **When** the file is served, **Then** it describes Spyglass, seeker onboarding paths, account/profile boundaries, A2A card locations, unsupported actions, and source-of-truth references.
2. **Given** an LLM crawler requests `/llms.txt`, **When** the file is served, **Then** it provides concise site instructions, allowed public surfaces, disallowed uses, and no private operational data.
3. **Given** F21 has not implemented runtime A2A handlers, **When** agent-readable docs describe A2A, **Then** they state that A2A discovery is published for future interop and is not required for the v0 customer flow.

---

### User Story 3 - Publish A2A Discovery Cards (Priority: P3)

An external agent or verifier can fetch well-known A2A card documents for the v0 candidate agent set and determine which capabilities are discovery-only, which require authentication, and which runtime operations are deferred.

**Why this priority**: F21 publishes A2A cards as first-class discovery artifacts while keeping protocol execution and employer delivery surfaces separated for later roadmap features.

**Independent Test**: Can be tested by fetching each well-known card path and the card index, validating card shape, checking capability metadata, and confirming no card implies unsupported runtime behavior is live.

**Acceptance Scenarios**:

1. **Given** an external agent requests the A2A card index, **When** the index is served, **Then** it lists `seeker-intake`, `employer-intake`, `match-coordinator`, `negotiation-participant`, and `dossier-reader` with stable card URLs.
2. **Given** an external agent requests any published card, **When** the card is served, **Then** it includes stable identity, audience, capability, auth, contact, availability, and unsupported-action metadata.
3. **Given** an external agent attempts to infer that v0 customer flow depends on A2A, **When** it reads the card metadata, **Then** the card states that A2A is a published discovery surface and not a v0 dependency.

---

### Edge Cases

- A visitor or agent requests dashboard-like paths such as `/dashboard`, `/jobs`, `/matches`, `/tickets`, `/analytics`, or `/recommended-jobs`.
- A seeker reaches signup/login/profile links while already authenticated, unauthenticated, or in an expired Clerk session.
- `agents.md`, `llms.txt`, or A2A card files are requested by generic browsers, crawlers, or agents with unusual accept headers.
- A well-known card name is unknown, malformed, incorrectly cased, or missing from the published index.
- A card is cached by downstream agents after capability status changes.
- Public content accidentally includes private route names, internal package details, secrets, operational runbooks, or non-public dossier/transcript details.
- Mobile viewport, keyboard-only navigation, high-contrast mode, or reduced-motion preference exposes text overlap or inaccessible controls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a public seeker landing page that communicates Spyglass as a conversation-first seeker advocate and directs humans to supported onboarding/account paths.
- **FR-002**: System MUST provide Clerk signup, login, and profile/account-management entry points without implementing a custom seeker dashboard; the profile/account entry point MUST be either a local route wrapping Clerk account/profile components or a Clerk-hosted account URL.
- **FR-003**: System MUST NOT add seeker dashboard, ticket-list, analytics, recommended-jobs, browse-jobs, public seeker profile, or product-shaped web surfaces.
- **FR-004**: System MUST provide explicit no-dashboard guard behavior for prohibited seeker web paths or navigation attempts.
- **FR-005**: System MUST preserve F20 as the conversational product surface; landing/profile pages cannot expose match ticket internals, raw dossiers, transcripts, hidden run state, scoring internals, or direct employer messaging.
- **FR-006**: System MUST serve `/agents.md` with agent-readable instructions for Spyglass identity, onboarding paths, account/profile boundaries, A2A card locations, unsupported actions, and governance references.
- **FR-007**: System MUST serve `/llms.txt` with concise LLM-readable site instructions, public-surface boundaries, and disallowed scraping/model-training reuse statements.
- **FR-008**: System MUST publish an A2A card index at a well-known public path listing the v0 candidate card set and stable card URLs.
- **FR-009**: System MUST publish individual A2A cards for `seeker-intake`, `employer-intake`, `match-coordinator`, `negotiation-participant`, and `dossier-reader`.
- **FR-010**: Each A2A card MUST state identity, audience, capability summary, auth posture, availability status, unsupported actions, public contact or documentation pointer, and whether runtime protocol operations are live or deferred.
- **FR-011**: A2A discovery docs MUST state that A2A is published for future interop and is not depended on for v0 customer flow.
- **FR-012**: Public surfaces MUST be safe to cache with intentional freshness metadata and must not leak private operational state.
- **FR-013**: Public web content MUST meet WCAG 2.2 AA-oriented semantics for headings, landmarks, links, focus order, visible focus, color contrast, and responsive text fit.
- **FR-014**: System MUST provide tests or validation fixtures proving prohibited seeker web product surfaces are absent.
- **FR-015**: System MUST document the F21 boundaries and public discovery contract in feature quickstart evidence.

### Key Entities *(include if feature involves data)*

- **Seeker Landing Surface**: Public human-readable page with positioning, channel onboarding paths, account/profile entry points, and no-dashboard boundary.
- **Clerk Account Entry Point**: Link or route into Clerk-hosted signup/login and Clerk-backed profile/account management for seeker accounts.
- **Agent Instructions Document**: `/agents.md` content for autonomous agents describing public surfaces and constraints.
- **LLM Instructions Document**: `/llms.txt` content for LLM/crawler consumption boundaries.
- **A2A Card Index**: Public well-known listing of published A2A card names and URLs.
- **A2A Agent Card**: Public discovery document for one candidate agent role, including availability and unsupported-action metadata.
- **No-Dashboard Guard**: Route/content policy that prevents dashboard-like web product surfaces from appearing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can reach signup/login/profile entry points from the landing page in two or fewer actions without encountering dashboard-like navigation.
- **SC-002**: Automated route/content checks find zero links or pages for seeker dashboard, tickets, matches, analytics, recommended jobs, browse jobs, or public seeker profile surfaces.
- **SC-003**: `/agents.md` and `/llms.txt` return successful public responses and include required sections for onboarding, A2A locations, unsupported actions, and public-surface boundaries.
- **SC-004**: The A2A card index and all five candidate card documents validate against the F21 card contract and state runtime/dependency status unambiguously.
- **SC-005**: Responsive rendering checks at mobile and desktop widths show no text overlap, inaccessible focus traps, or missing landmarks on the landing surface.
- **SC-006**: F21 quickstart evidence demonstrates landing, Clerk links, agent docs, card index, individual cards, no-dashboard guards, accessibility semantics, type-check, lint, tests, and build.

## Assumptions

- Existing `apps/web` Next.js app and Clerk route groups remain the web host for F21.
- Existing `apps/web/public/agents.md` and `apps/web/public/llms.txt` placeholders are replaced in F21 rather than introducing a separate documentation service.
- `@spyglass/a2a` currently has minimal scaffolding; F21 may add card schema/build helpers but not full A2A protocol handlers.
- F23 owns employer REST API and signed webhook delivery; F25 owns broader Phase 0 launch posture.
- A2A receiver projection rules remain subject to Parley protocol stabilization; F21 cards must avoid promising unsupported projection delivery semantics.
- Public marketing copy can be product-accurate without counsel-specific Phase 1 jurisdiction claims.
