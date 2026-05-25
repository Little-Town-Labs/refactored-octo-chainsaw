# Research: Employer Admin Console

## Decision: Reuse Clerk organization identity and existing principal gates

**Rationale**: PRD §3.2 defines employers as organizations with multiple seats, and the identity architecture already maps Clerk organization sessions to `employer_admin` and `employer_member` principals. Reusing this path preserves AAL2, principal coverage, and org scoping.

**Alternatives considered**: Building a separate employer membership table for F22 was rejected because it would duplicate Clerk organization state and increase authorization drift.

## Decision: Model F22 as a thin web console over existing ticket primitives

**Rationale**: PRD §6.1 requires admin console req creation, thresholds, candidate inbox, and close actions. Existing `@spyglass/tickets` and web server actions already cover employer req creation, amendment, transitions, and org-scoped reads.

**Alternatives considered**: Waiting for F23 REST APIs was rejected because the roadmap explicitly makes the console always available without integration.

## Decision: Keep REST, signed webhooks, ATS connectors, and A2A runtime out of scope

**Rationale**: The roadmap assigns those surfaces to F23 or later. F22 should not create external integration contracts beyond human web routes and server-action form contracts.

**Alternatives considered**: Adding an internal JSON API for console pages was rejected because RSC/server actions match existing operator-console and ticket-action patterns.

## Decision: Candidate inbox shows delivered, employer-owned dossier projections only

**Rationale**: PRD §5.2 says external delivery goes through webhooks, A2A, or console. The console should show interview-ready candidates, not raw negotiation state. This preserves privacy-filter and dossier-boundary invariants.

**Alternatives considered**: Showing all match tickets or in-progress negotiations was rejected because it would leak unapproved run state and turn the console into an analytics/matching dashboard.

## Decision: Follow operator-console accessibility patterns

**Rationale**: F02 already established skip-link, landmark, table, form, confirmation, and error-summary patterns. F22 should reuse that style for consistency and WCAG 2.2 AA evidence.

**Alternatives considered**: Introducing a new design system or card-heavy dashboard pattern was rejected as unnecessary for a thin operational console.
