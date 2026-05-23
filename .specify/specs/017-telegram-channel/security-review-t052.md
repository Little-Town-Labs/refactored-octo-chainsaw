# Security Review: F17 Telegram Channel Adapter

**Date**: 2026-05-23
**Scope**: Telegram adapter package and F17 contracts.

## Findings

No blocking security findings.

## Controls Verified

- Unknown, disabled, malformed, oversized, duplicate, and unsupported inbound updates fail closed with provider-neutral refusal or suppression outcomes.
- Inbound Telegram text is classified as untrusted user input.
- Outbound rendering requires approved projection or system notice posture and refuses missing/unapproved disclosure.
- Raw counterparty records, canonical transcripts, hidden Parley state, scoring internals, and unfiltered dossier internals are not included in Telegram provider payloads.
- Provider delivery responses are mapped to bounded provider-neutral outcomes, with retry hints preserved for throttling.
- No Telegram bot token, secret material, or live provider credential is required for tests or staged dev run.

## Residual Risk

- When a production webhook is added, it must validate Telegram's webhook secret-token header, use scoped bot credentials from secret storage, and emit deployment-level audit/log evidence without leaking tokens.
