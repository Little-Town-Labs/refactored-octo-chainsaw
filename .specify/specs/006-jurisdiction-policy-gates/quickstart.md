# Quickstart — F06 Jurisdiction Policy Gates

## Scenario 1 — Allow Supported Jurisdictions

1. Seed active `allowed` policies for `US-MO` and `US-KS`.
2. Create F04 seeker/employer/match fixtures whose required jurisdiction set is `["US-MO", "US-KS"]`.
3. Evaluate the policy gate for the match subject.
4. Verify the decision is `allow` with `reason_code='all_allowed'`.
5. Verify a canonical audit event exists for the gate decision.

## Scenario 2 — Fail Safe On Missing Or Unknown Jurisdiction

1. Evaluate a gate request with no jurisdiction codes.
2. Verify the decision is `deny` with `reason_code='missing_jurisdiction'`.
3. Evaluate a gate request with `["US-XX"]`.
4. Verify the decision is `deny` with `reason_code='unknown_jurisdiction'`.
5. Verify neither path proceeds without a structured decision row and audit evidence.

## Scenario 3 — Deny Unsupported Or Disabled Jurisdiction

1. Seed `US-NY` as `unsupported`.
2. Seed `US-IL` as `disabled`.
3. Evaluate gate requests for each jurisdiction.
4. Verify `US-NY` denies with `unsupported_jurisdiction`.
5. Verify `US-IL` denies with `disabled_jurisdiction`.
6. Verify each denial can produce a structured failure artifact.

## Scenario 4 — Flip Kill Switch Without Deploy

1. Seed `US-MO` as `allowed`.
2. Evaluate a gate request for `US-MO` and verify `allow`.
3. Execute a scoped kill-switch change to `disabled` with a closed-list reason.
4. Re-evaluate `US-MO` and verify new decisions deny within one minute.
5. Verify the kill-switch change has operator attribution, correlation id, policy version, and canonical audit evidence.

## Scenario 5 — Deny Unauthorized Kill-Switch Mutation

1. Attempt a kill-switch change with no required scope.
2. Verify the mutation is denied.
3. Verify the active jurisdiction posture remains unchanged.
4. Verify the denial is recorded or audited when an authenticated principal was present.

## Scenario 6 — Scoped Review Reads

1. Seed policy posture, gate decisions, and a kill-switch event.
2. Attempt active posture read without `policy.read` and verify denial.
3. Read active posture with `policy.read`.
4. Query bounded decision history by jurisdiction and date range.
5. Verify results include policy version, reason code, decision, correlation id, and audit reference without raw personal data.

## Expected Local Gates

```sh
pnpm --filter @spyglass/policy-gates test
pnpm --filter @spyglass/policy-gates type-check
pnpm --filter @spyglass/policy-gates lint
pnpm schema:lint
pnpm --filter @spyglass/policy-gates dev-run:f06
```

The staged dev run should write `.specify/specs/006-jurisdiction-policy-gates/quickstart-run-<date>.md` and roll back seeded rows.
