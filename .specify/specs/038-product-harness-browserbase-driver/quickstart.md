# Quickstart: PTH13 Browserbase Preview/Prod Replay Driver

## Local Validation

```bash
pnpm --filter @spyglass/product-test-harness test -- browserbase-driver
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness lint
pnpm --filter @spyglass/product-test-harness build
pnpm format:check
```

## Runtime Wiring

```ts
import {
  BrowserbaseBrowserJourneyDriver,
  browserbaseDriverConfigFromEnv,
} from "@spyglass/product-test-harness";

const config = browserbaseDriverConfigFromEnv(process.env);
const driver = new BrowserbaseBrowserJourneyDriver({
  config,
  sessionClient,
  connector,
});
```

PTH14 should provide the concrete Browserbase SDK/session client and Playwright connector when Browserbase secrets are present.
