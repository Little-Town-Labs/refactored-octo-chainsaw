# F20 Security and Privacy Review

**Date**: 2026-05-25

## Scope Reviewed

- Verified channel posture checks before product mutation.
- Duplicate suppression before product side effects.
- No-dashboard and forbidden-data refusals.
- Approved projection requirement for match notification.
- Parley run-to-completion boundary for dossier review actions.
- Aggregate insight reports limited to approved aggregate inputs.
- Demographic consent, decline, withdrawal, counsel-disabled, jurisdiction-disabled, segregated-reference behavior, and operational-profile separation.
- Outbound prompt/action accessibility review for WCAG-facing semantics.

## Findings

No blocking findings.

## Notes

- The package remains fixture-backed and repository-interface-driven; production route hosting, durable scheduler wiring, and Clerk profile/account UI remain out of scope.
- The demographic collection posture is disabled unless consent, counsel posture, jurisdiction posture, and segregated data reference are all present.
- Outbound prompts use stable action ids and bounded text. Future web rendering should continue to validate visible labels, focusable action semantics, and status text through the F19 web-chat accessibility contract before UI exposure.

## Verification

- `demographics.test.ts` asserts consented data uses `segregatedDataRef` and does not write operational profile state.
- `boundary.test.ts` asserts dashboard-like and hidden/raw-data requests are refused.
- `match-notifications.test.ts` asserts stale, unauthorized, jurisdiction-blocked, and projection-missing events fail closed.
- `dossier-review.test.ts` asserts review decisions are recorded without Parley internals.
