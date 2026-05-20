# Candidate Notifications Runbook

## Scope

F11 owns candidate notification artifacts, timing evidence, delivery gates, and channel-agnostic delivery commands. It does not send email, Telegram, web, or A2A messages.

## Normal Operation

1. Publish an immutable notice template version for each notice category and jurisdiction scope.
2. Create a candidate notification artifact from `dossier.produced` evidence.
3. Evaluate the delivery gate before any channel delivery command is emitted.
4. Generate delivery commands only after the gate returns `notice_ready`.
5. Use scoped review reads for counsel, compliance, and incident response.

## Refusal Reasons

- `missing_artifact`: no required candidate notice artifact exists.
- `artifact_blocked`: artifact exists but is blocked or superseded.
- `template_not_published`: pinned template is not published.
- `template_superseded`: pinned template has been superseded before delivery.
- `not_yet_eligible`: advance notice timing has not elapsed.
- `missing_recipient`: candidate recipient ref is absent.
- `invalid_payload`: artifact or policy evidence is malformed.
- `policy_blocked`: jurisdiction policy blocks notification delivery.

## Rollback

F11 rows are immutable compliance evidence. Do not edit or delete rows to roll back behavior. Publish a new template version, stop creating delivery commands for the bad artifact, and append a new gate event or audit event documenting the corrected posture.

## Verification

```bash
pnpm --filter @spyglass/notifications test
pnpm --filter @spyglass/notifications type-check
pnpm --filter @spyglass/notifications lint
pnpm --filter @spyglass/notifications build
pnpm --filter @spyglass/notifications dev-run:f11
pnpm --filter @spyglass/db build
pnpm schema:lint
```
