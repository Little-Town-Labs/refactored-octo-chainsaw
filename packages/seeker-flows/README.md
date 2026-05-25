# @spyglass/seeker-flows

F20 seeker product orchestration for conversational onboarding and ongoing seeker flows.

This package consumes canonical F16-F19 channel messages and emits approved outbound product prompts for Telegram, email, and Clerk-authenticated web chat. It owns flow decisions for onboarding, resume/profile capture, work-jurisdiction attestation, thresholds, match notifications, dossier review, pause/resume/withdraw controls, aggregate insight, demographic consent posture, duplicate suppression, and audit evidence.

Out of scope: provider webhook routes, Clerk account/profile pages, seeker dashboards, ticket lists, analytics views, recommended-jobs UI, direct employer messaging, and Parley run mutation.

Run:

```bash
pnpm --filter @spyglass/seeker-flows test
pnpm --filter @spyglass/seeker-flows type-check
pnpm --filter @spyglass/seeker-flows lint
pnpm --filter @spyglass/seeker-flows dev-run:f20
```
