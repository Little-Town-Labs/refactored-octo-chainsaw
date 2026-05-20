# F09 Privacy Filter Runbook

## Scope

F09 owns deterministic counterparty-safe projections, untrusted-input sentinel wrapping, no-model reachability checks, side-runner counterparty-access checks, and scoped review evidence. It does not run Parley orchestration, build dossiers, or segregate demographic data.

## Publish A Ruleset

1. Require `privacy_filter:publish`.
2. Publish a new `(ruleset_id, version)` through `publishPrivacyRuleset`.
3. Confirm the ruleset is `published`, has at least one disclosure stage, and stores a canonical `sha256:` content hash.
4. Never mutate an existing ruleset ref. Publish a new version for policy changes.

## Filtering

1. Use `filterForCounterparty` with a published ruleset ref, target audience, input class, source ref, and structured content.
2. Missing, unpublished, audience-mismatched, oversized, or all-redacted inputs fail closed without raw output.
3. Successful results return a filtered view ref, sanitized output, redaction counts, reason code, ruleset ref, disclosure stage, and audit ref when supplied.

## Sentinels

1. Wrap untrusted text with `wrapUntrustedText`.
2. Use a per-run nonce and the correct input class.
3. Validate with `validateUntrustedEnvelope` before prompt construction.
4. Record `sentinel_missing`, `sentinel_mismatch`, `sentinel_duplicate`, or `sentinel_injection_detected` through `recordSentinelFailure`.

## F08.5 Port

Use `createToolPrivacyFilterPort` for `counterparty_filtered` tool outputs. If filtering refuses the output, the port throws and the caller must fail closed rather than expose raw tool output.

## Guards

Run:

```bash
pnpm --filter @spyglass/privacy-filter reachability:check
pnpm --filter @spyglass/privacy-filter boundary:check
```

The reachability guard scans the privacy-filter source for model/gateway imports. The access-boundary guard scans side-runner source for direct raw counterparty access.

## Review

Require `privacy_filter:review` and use `readPrivacyReviewBundle`. Review output includes rulesets, decisions, sentinel failures, and boundary findings. It does not expose raw sensitive payloads by default.

## Rollback

Deprecate the ruleset with `deprecatePrivacyRuleset`, then publish a replacement version. Historical decisions remain reviewable through their original ruleset refs.
