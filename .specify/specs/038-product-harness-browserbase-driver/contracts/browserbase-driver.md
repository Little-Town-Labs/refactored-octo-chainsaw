# Contract: Browserbase Browser Journey Driver

## Public API

```ts
interface BrowserbaseSessionClient {
  createSession(input: BrowserbaseCreateSessionInput): Promise<BrowserbaseSession>;
  closeSession?(sessionId: string): Promise<void>;
}

interface BrowserbasePlaywrightConnector {
  runVisit(input: BrowserbasePlaywrightVisitInput): Promise<BrowserbasePlaywrightVisitResult>;
}

class BrowserbaseBrowserJourneyDriver implements BrowserJourneyDriver {
  readonly driver_name = "browserbase-playwright";
  visit(input: BrowserJourneyVisitInput): Promise<BrowserJourneyVisitResult>;
}

function browserbaseDriverConfigFromEnv(env: Record<string, string | undefined>): BrowserbaseDriverConfig;
```

## Required Env

- `BROWSERBASE_PROJECT_ID`
- `BROWSERBASE_API_KEY`

## Optional Env

- `BROWSERBASE_REGION`

## Behavior

- Missing config throws `BrowserbaseDriverConfigError`.
- Session cleanup is attempted after connector completion.
- Connector failures return failed visit results with safe error text.
- Raw API keys and credential-bearing connection URLs are never returned in evidence refs.
