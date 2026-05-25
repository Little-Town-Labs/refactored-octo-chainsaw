# Feature Specification: Employer Admin Console

**Feature Branch**: `022-employer-admin-console`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "F22 Employer admin console as the next roadmap work. Run the Spec Kit specify -> clarify/plan/tasks flow for `22-employer-admin-console`, reading PRD employer/admin sections, identity/admin access requirements, and existing operator console patterns before drafting the spec."

## Clarifications

### Session 2026-05-25

- No blocking clarification questions were required after reading PRD §3.2, §5.3, §6.1, identity/auth frontend architecture, and the existing operator-console patterns. F22 follows the roadmap boundary: employer admin console only; F23 owns REST APIs and signed webhooks; ATS connectors remain out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Employer Organization Profile (Priority: P1)

An employer admin can open the employer console, verify the active Clerk organization context, and view or update the company profile details needed for Spyglass employer-side matching.

**Why this priority**: The employer console is organization-scoped. Req creation and candidate review are unsafe until the admin can confirm the company context and profile data that the employer advocate represents.

**Independent Test**: Render the employer console as an employer admin with AAL2 satisfied, verify organization context is visible, update allowed company-profile fields, and confirm non-admin or wrong-organization principals cannot view or mutate the profile.

**Acceptance Scenarios**:

1. **Given** an employer admin is signed in with a Clerk organization and AAL2 satisfied, **When** they open the employer console, **Then** they see the active organization name, profile summary, and navigation for profile, reqs, and candidates.
2. **Given** the employer profile is incomplete, **When** the admin submits required company profile fields, **Then** the console saves the profile under the active organization and shows a non-enumerating success state.
3. **Given** an employer member without admin privileges or a seeker principal, **When** they attempt to update the employer profile, **Then** the update is denied without leaking other organization data.

---

### User Story 2 - Create and Manage Requisitions (Priority: P1)

An employer admin can create a requisition ticket, set matching thresholds and hiring-jurisdiction attestations, review the organization's req list, and close a req as filled or canceled.

**Why this priority**: PRD §6.1 requires employer admins to post reqs, set thresholds, attest jurisdiction, and close reqs. This is the core no-integration path for employer onboarding.

**Independent Test**: Submit a req as an employer admin, verify the created employer req ticket is scoped to the active organization, list it in the console, edit allowed source fields, and close it with a valid terminal reason.

**Acceptance Scenarios**:

1. **Given** an employer admin has completed company profile context, **When** they create a req with role, level, compensation band, work mode, headcount, threshold, hiring jurisdiction, and decision locus, **Then** an employer req ticket is created for the active organization.
2. **Given** an employer admin views reqs, **When** their organization has active, filled, and canceled reqs, **Then** the list shows only that organization's reqs with state, headcount, jurisdictions, and next actions. Canceled is a user-facing label for the existing internal `closed` terminal state with a cancellation reason.
3. **Given** a req is active, **When** an employer admin updates allowed source fields that affect matching, **Then** the update is audited and any jurisdiction-sensitive active match handling follows existing ticket-source workflow rules.
4. **Given** an employer admin closes a req as filled or canceled, **When** the action succeeds, **Then** the req state and audit trail reflect the terminal outcome and no further candidate matches are presented for that req. Canceled reqs persist internally as `closed`.

---

### User Story 3 - Review Candidate Inbox and Dossiers (Priority: P2)

An employer admin or authorized employer member can review interview-ready candidate entries produced by match tickets and inspect signed dossier summaries without exposing seeker-private negotiation internals.

**Why this priority**: The console must deliver the v0 no-integration candidate experience. It depends on reqs and match/dossier outputs, so it follows profile and req management.

**Independent Test**: Seed org-owned match tickets with delivered dossiers, render the candidate inbox, verify only organization-owned entries are shown, open a candidate detail, and ensure private transcripts, hidden run state, and seeker-confidential fields are absent.

**Acceptance Scenarios**:

1. **Given** an employer has delivered match dossiers, **When** an authorized employer user opens the candidate inbox, **Then** they see candidate entries grouped or filterable by req, state, and delivery time.
2. **Given** a candidate entry has a signed dossier, **When** the user opens the detail view, **Then** the console shows the approved employer-side dossier projection and signature metadata without raw transcript or private seeker context.
3. **Given** a match has not cleared the employer delivery gate, **When** the user opens the candidate inbox, **Then** that match is not shown.
4. **Given** an employer user attempts to open another organization's candidate entry, **When** authorization is evaluated, **Then** the request fails closed without revealing the entry exists.

---

### User Story 4 - Operate Accessibly and Safely (Priority: P2)

Employer users can operate the console with keyboard and assistive technology while security, privacy, and audit controls remain visible and non-enumerating.

**Why this priority**: F22 is a human UI feature under Constitution §III.1 and an employer-admin surface under §I.5.1. Accessibility and AAA evidence are release-blocking.

**Independent Test**: Run render/accessibility smoke tests for console landmarks, forms, tables, dialogs, error summaries, and auth banners; verify all mutating actions require authenticated employer admin principals and AAL2.

**Acceptance Scenarios**:

1. **Given** a keyboard-only employer admin, **When** they navigate the console, **Then** skip links, landmarks, focus order, table captions, form labels, and confirmation dialogs are operable.
2. **Given** an employer admin is authenticated below AAL2, **When** they open admin-only console surfaces, **Then** the experience routes to the existing MFA step-up path instead of rendering sensitive data.
3. **Given** a server action fails validation, **When** the form re-renders, **Then** field-level errors and a summary identify what to fix without exposing internal policy or principal details.

### Edge Cases

- Employer user has a valid Clerk session but no active organization.
- Employer user belongs to multiple organizations and switches active org context.
- Employer member can view candidate inbox but cannot create/update/close reqs.
- A req create or update omits hiring jurisdiction or decision locus.
- Compensation minimum exceeds maximum, unsupported currency is submitted, or headcount is below one.
- Jurisdiction policy gates reject a req or match after a field update.
- Candidate dossier exists but signature metadata is unavailable or invalid.
- Candidate inbox has no delivered candidates yet.
- Pagination cursor is malformed or stale.
- Browser refresh occurs after a successful server action.
- Clerk public configuration is absent in local validation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an employer console entry point for Clerk organization-backed employer users.
- **FR-002**: System MUST require authenticated employer principals and AAL2 for employer console pages that expose organization, req, candidate, or dossier data.
- **FR-003**: System MUST distinguish employer admin and employer member capabilities: admins can manage company profile and reqs; members can view permitted candidate inbox and dossier projections.
- **FR-004**: System MUST display the active employer organization context and fail closed when no employer organization is available.
- **FR-005**: Employer admins MUST be able to view and update company profile fields needed by the employer advocate, without building ATS administration or billing surfaces.
- **FR-006**: Employer admins MUST be able to create employer req tickets with role title, role level, compensation band, currency, work mode, headcount, matching threshold, hiring jurisdiction, and decision locus.
- **FR-007**: Req creation MUST persist the req under the active employer organization and use the existing employer req ticket state machine.
- **FR-008**: Employer admins MUST be able to list organization-owned reqs with state, role, headcount, jurisdictions, and next actions.
- **FR-009**: Employer admins MUST be able to amend allowed req source fields and close reqs as `filled` or `closed` with audited outcomes. The UI MAY label `closed` reqs as canceled when the close reason is cancellation.
- **FR-010**: System MUST preserve existing jurisdiction-cascade and audit behavior when employer req source fields change.
- **FR-011**: System MUST provide a candidate inbox for organization-owned delivered matches and approved employer-side dossier projections.
- **FR-012**: Candidate inbox and detail views MUST NOT expose seeker-private negotiation posture, raw transcripts, hidden run state, score internals outside approved dossier projection, or private employer-agent chain-of-thought.
- **FR-013**: System MUST present signed dossier metadata or a clear unavailable/invalid state without silently treating unsigned dossiers as valid.
- **FR-014**: System MUST include accessible landmarks, skip link, labelled forms, table captions/headers, keyboard-operable controls, and error summaries for console workflows.
- **FR-015**: All mutating employer console actions MUST call the typed principal path and be covered by the principal-coverage gate; no anonymous mutating action is allowed.
- **FR-016**: System MUST keep F23 REST API, signed webhook delivery, ATS connectors, A2A runtime handlers, and candidate disposition mutation out of F22 scope.

### Key Entities *(include if feature involves data)*

- **Employer Organization Profile**: Organization-scoped company context used by the employer advocate, including public-facing company summary and matching-relevant attributes.
- **Employer Console Session**: The authenticated employer principal, active Clerk organization, tier, AAL posture, and permitted console capabilities.
- **Employer Requisition**: Organization-owned employer req ticket with role details, compensation band, jurisdictions, threshold, headcount, and state.
- **Candidate Inbox Entry**: Employer-visible projection of a delivered match ticket tied to one req and an approved dossier.
- **Dossier Projection**: Employer-side, signed summary artifact suitable for human review; distinct from raw transcript or hidden run state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employer admin can create a valid req from the console in one form submission and see it in the organization req list.
- **SC-002**: Unauthorized principals, wrong-organization principals, and below-AAL2 employer sessions cannot render or mutate employer console data in automated tests.
- **SC-003**: Candidate inbox tests prove only organization-owned delivered matches with approved dossier projections are visible.
- **SC-004**: Accessibility smoke tests cover landmarks, tables, forms, dialogs, keyboard focus, and error summaries for every F22 page.
- **SC-005**: F22 quickstart evidence records passing web tests, type-check, lint, build, principal-coverage, and focused employer-console route/action validation.
- **SC-006**: No F22 page or contract introduces seeker dashboard surfaces, F23 API/webhook behavior, ATS connector behavior, A2A runtime handlers, candidate disposition mutation, or anonymous mutating handlers.

## Assumptions

- Existing Clerk organization sessions and principal materialization remain the source of employer identity.
- Existing ticket-store primitives for employer req creation, amendment, transition, and org-scoped reads will be reused before adding new durable tables.
- F22 may introduce a minimal organization profile store only if existing organization data is insufficient for company-profile UX.
- Candidate inbox can initially consume existing match-ticket, dossier, and notification artifacts; full signed webhook delivery remains F23.
- Candidate disposition capture is deferred outside F22; F22 candidate surfaces are read-only dossier review surfaces.
- Employer members are read-oriented by default; employer admins own req/profile mutation.
- Browser screenshot validation is useful but not required unless a project-standard Playwright setup is added.
