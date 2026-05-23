# Security and Accessibility Review: F19 Web-Chat Channel Adapter

**Date**: 2026-05-23
**Reviewer**: Codex
**Scope**: `packages/web-chat-channel`

## Summary

No critical or high findings.

## Security Review

- PASS: Canonical inbound messages require verified link posture or pending verification/resume posture.
- PASS: Unauthenticated, expired-session, unknown-principal, blocked-link, wrong-thread, malformed, over-size, expired-action, and unsupported intents fail closed.
- PASS: Duplicate suppression runs before canonical message acceptance for browser retries.
- PASS: Public adapter types use bounded session/principal references and do not accept Clerk secrets or session tokens.
- PASS: Outbound rendering requires approved projection or system notice disclosure posture.
- PASS: Boundary tests reject dashboard, ticket-list, analytics, recommended-jobs, direct-counterparty, hidden-state, raw-dossier, and Parley override intents.

## Accessibility Review

- PASS: Render models carry accessible names for interactive actions.
- PASS: Render models carry keyboard activation semantics for action controls.
- PASS: Render models carry focus-order hints for enabled actions.
- PASS: Disabled controls require a disabled reason.
- PASS: Status announcement posture is explicit.
- PASS: Reduced-motion-safe posture is required and validated.

## Residual Risk

- DOM-level WCAG validation remains the responsibility of the consuming web surface. F19 provides testable render semantics, not rendered HTML.
- Operator/manual assistive-technology verification should occur in the future `apps/web` integration feature.
