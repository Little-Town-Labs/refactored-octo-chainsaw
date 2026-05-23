# Quickstart: Web-Chat Channel Adapter

This quickstart defines the evidence expected from F19 implementation.

## 1. Install and Inspect

```bash
pnpm install
pnpm --filter @spyglass/web-chat-channel type-check
```

## 2. Run Package Tests

```bash
pnpm --filter @spyglass/web-chat-channel test
pnpm --filter @spyglass/web-chat-channel lint
pnpm --filter @spyglass/web-chat-channel build
```

Expected coverage:

- Authenticated inbound text normalization.
- Pending-link verification/resume normalization.
- Unauthenticated, expired-session, wrong-participant, disabled, paused, malformed, over-size, wrong-thread, expired-action, and unsupported refusals.
- Browser retry duplicate suppression.
- Approved outbound render models and refused unapproved disclosure posture.
- Delivery/status mapping.
- WCAG-facing accessibility contract validation.
- Boundary tests for dashboard/direct-negotiation/product execution and prohibited data surfaces.

## 3. Run Staged F19 Scenario

```bash
pnpm --filter @spyglass/web-chat-channel dev-run:f19
```

The staged run should print or persist evidence for:

1. Authenticated inbound web-chat normalization.
2. Pending-link verification/resume handling.
3. Duplicate client retry suppression.
4. Unauthenticated prompt/refusal posture.
5. Approved outbound render model creation.
6. Accessibility contract validation.
7. Delivery/status result mapping.
8. Unsupported dashboard/direct-negotiation intent refusal.

## 4. Record Evidence

After implementation, record the staged run output in:

```text
.specify/specs/019-web-chat-channel/quickstart-run-2026-05-23.md
```

## 5. Non-Goals to Verify

Confirm the implementation does not add:

- Full seeker onboarding or F20 product execution.
- Seeker dashboard, ticket list, analytics UI, or recommended-jobs UI.
- Production `apps/web` route hosting.
- Clerk admin/profile UI or raw Clerk token handling.
- Direct Parley run control, scoring, dossier construction, or privacy-filter rule evaluation.
