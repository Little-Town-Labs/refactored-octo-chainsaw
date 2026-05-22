# F14 Quickstart: Employer Advocate Agent

This quickstart is the planned staged verification path for F14.

## Prerequisites

- Current branch: `014-employer-advocate`
- Active Spec Kit pointer: `.specify/specs/014-employer-advocate`
- Existing F07a/F07b/F08/F09/F10/F12/F13 packages available from `main`
- No live provider credentials required; F14 uses fake-gateway fixtures for staged evidence

## Staged Verification

1. Install dependencies if needed:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Run package tests:

   ```bash
   pnpm --filter @spyglass/agents test
   ```

3. Run package type-check:

   ```bash
   pnpm --filter @spyglass/agents type-check
   ```

4. Run package lint:

   ```bash
   pnpm --filter @spyglass/agents lint
   ```

5. Run package build:

   ```bash
   pnpm --filter @spyglass/agents build
   ```

6. Run the staged F14 eval/dev scenario:

   ```bash
   pnpm --filter @spyglass/agents dev-run:f14
   ```

## Expected Evidence

The staged run should record:

- Accepted employer turn with frozen prompt/model/manifest/contract/rubric/privacy/tool refs.
- Accepted employer scoring result with one valid entry per employer-rubric dimension.
- Inconclusive flag path for insufficient evidence.
- Refusal path for unfiltered seeker data.
- Refusal or safe handling for prompt-injection content.
- Unsupported-tool refusal.
- Rubric-bias-gate refusal.
- Protected-class boundary refusal or flagged rejection.
- Budget-limit refusal or downgrade according to manifest policy.
- Direct-provider import boundary result.

## Closure Criteria

F14 is ready for tasks closure only when the staged run evidence is saved under this feature directory, package gates pass, `/speckit-analyze` reports no blocking artifact inconsistencies, and `/code-review` plus `/security-review` findings are resolved or explicitly tracked.
