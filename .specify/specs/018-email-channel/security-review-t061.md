# Security Review T061: Email Channel Adapter

**Date:** 2026-05-23
**Scope:** F18 email channel adapter

## Findings

No blocking findings.

## Controls Verified

- Inbound subject, body, header-derived values, attachment names, and free text are treated as untrusted user input.
- Unknown, disabled, unsubscribed, suppressed, spam-flagged, spoof-risk, malformed, oversized, and wrong-thread events fail closed.
- Outbound rendering refuses missing or unapproved disclosure posture before any provider payload is produced.
- Public rendering payloads have no path for raw counterparty records, transcripts, hidden Parley state, scoring internals, provider secrets, or unfiltered dossier internals.
- Provider native identifiers are bounded metadata, not semantic content.
- Raw attachment bytes, MIME parsing, webhook hosting, and provider account administration remain outside the adapter boundary.

## Residual Risk

- Webhook signature verification, abuse throttling, and provider secret storage must be implemented at the future route/worker boundary.
- Attachment malware scanning and storage remain out of scope; F18 only supports bounded references or refusal.
