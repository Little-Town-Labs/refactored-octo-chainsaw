# @spyglass/email-channel

F18 implements the email seeker-channel adapter boundary. It converts provider-parsed
email webhook events into F16 `ChannelMessage` values, renders approved canonical
outbound messages into text-first email payloads, and maps provider delivery events
into provider-neutral outcomes.

The package does not own webhook hosting, DNS/domain administration, channel-link
persistence, unsubscribe storage, product actions, privacy-filter decisions, Parley
run control, scoring, dossier construction, or raw MIME/attachment processing.

## Validation

```bash
pnpm --filter @spyglass/email-channel test
pnpm --filter @spyglass/email-channel type-check
pnpm --filter @spyglass/email-channel lint
pnpm --filter @spyglass/email-channel build
pnpm --filter @spyglass/email-channel dev-run:f18
```
