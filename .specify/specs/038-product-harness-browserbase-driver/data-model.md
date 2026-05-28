# Data Model: PTH13 Browserbase Preview/Prod Replay Driver

## BrowserbaseDriverConfig

| Field | Type | Notes |
| --- | --- | --- |
| `project_id` | `string` | Browserbase project identifier |
| `api_key_ref` | `string` | Redacted reference to configured API key |
| `region` | `string?` | Optional Browserbase region |
| `browser` | `chromium` | Initial browser target |
| `headless` | `boolean` | Defaults to true |

## BrowserbaseSession

| Field | Type | Notes |
| --- | --- | --- |
| `session_id` | `string` | Safe Browserbase session identifier |
| `connect_url` | `string` | Credential-bearing URL used only by connector |
| `replay_url` | `string?` | Safe replay evidence ref |
| `artifact_refs` | `string[]?` | Safe artifact refs produced by provider |

## BrowserbasePlaywrightVisitInput

Includes Browserbase session, route URL, viewport, expected status/text, journey metadata, and run ID.

## BrowserbasePlaywrightVisitResult

Connector output mapped into `BrowserJourneyVisitResult`: status, evidence refs, console messages, network entries, and safe error text.

## Result Boundary

The existing browser journey runner consumes only `BrowserJourneyDriver`. Browserbase-specific details remain inside evidence refs and driver metadata.
