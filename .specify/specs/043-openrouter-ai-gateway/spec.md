# Feature Specification: F12 Follow-up OpenRouter AI Gateway

**Feature Branch**: `043-openrouter-ai-gateway`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Use OpenRouter for now instead of Vercel AI Gateway, while preserving the governed Spyglass AI invocation surface."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invoke Through OpenRouter Without Bypassing Governance (Priority: P1)

As the Spyglass AI runtime, I need production model calls to use OpenRouter behind the existing governed gateway adapter, so the provider can change without letting agent code call models directly.

**Why this priority**: The application needs a real provider path before live AI testing, but F12's centralized invocation, manifest, allowlist, audit, and cost controls must remain intact.

**Independent Test**: Given OpenRouter configuration and an approved OpenRouter model profile, invoke through the existing `@spyglass/ai` gateway adapter contract using a mocked HTTP response and verify content, usage metadata, and response hash are returned through the governed surface.

**Acceptance Scenarios**:

1. **Given** OpenRouter credentials and a model profile whose provider is `openrouter`, **When** the governed invocation surface calls the gateway adapter, **Then** the adapter sends a chat completion request to OpenRouter and returns normalized content, usage metadata, and hash evidence.
2. **Given** a missing OpenRouter API key or an unavailable OpenRouter response, **When** the gateway adapter is invoked, **Then** the invocation fails closed through the existing gateway failure path without exposing the API key.
3. **Given** package import-boundary verification runs, **When** it scans agent packages, **Then** no agent package can import OpenRouter or another provider SDK directly.

---

### User Story 2 - Configure and Operate OpenRouter Secrets Clearly (Priority: P2)

As an operator deploying Spyglass, I need the runbook and generated environment manifest to list the OpenRouter secrets and optional attribution settings, so deployment setup is clear and does not depend on the retired AI Gateway key.

**Why this priority**: The production deployment cannot be made reliable if the documented secrets still point operators toward Vercel AI Gateway.

**Independent Test**: Regenerate `.env.example` from the shared schema and verify OpenRouter variables appear with accurate descriptions while stale AI Gateway-only guidance is removed or marked legacy.

**Acceptance Scenarios**:

1. **Given** an operator is setting up AI provider credentials, **When** they read the generated env manifest and runbook, **Then** they see `OPENROUTER_API_KEY` as the required production provider secret and optional site attribution variables.
2. **Given** `.env.example` is regenerated, **When** the drift gate runs, **Then** it reports no drift against the shared environment schema.

### Edge Cases

- OpenRouter returns a successful HTTP response with no assistant message content.
- OpenRouter returns non-JSON or malformed JSON.
- OpenRouter returns usage metadata that omits one or more token counts.
- A configured base URL has a trailing slash.
- A model profile still lists the old `vercel-ai-gateway` provider while the deployment only has OpenRouter credentials.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an OpenRouter gateway adapter behind the existing `@spyglass/ai` `GatewayAdapter` contract.
- **FR-002**: System MUST authenticate OpenRouter requests with a server-only `OPENROUTER_API_KEY` bearer token.
- **FR-003**: System MUST send non-streaming chat completion requests to OpenRouter's OpenAI-compatible chat completions endpoint.
- **FR-004**: System MUST normalize OpenRouter assistant content and usage metadata into the existing `GatewayResponse` shape.
- **FR-005**: System MUST compute response hash evidence using the same canonical hashing posture as the fake gateway adapter.
- **FR-006**: System MUST fail closed on missing credentials, non-2xx responses, malformed responses, or empty assistant content.
- **FR-007**: System MUST NOT add direct OpenRouter/provider imports to agent packages or bypass the existing governed invocation path.
- **FR-008**: System MUST expose OpenRouter environment configuration through the shared env schema and generated `.env.example`.
- **FR-009**: System MUST document OpenRouter setup, Vercel secret names, optional attribution headers, and provider allowlist guidance in the AI infrastructure runbook.

### Key Entities *(include if feature involves data)*

- **OpenRouter Gateway Configuration**: Server-only API key, optional base URL override, and optional attribution values used when constructing OpenRouter requests.
- **OpenRouter Gateway Adapter**: Implementation of the existing gateway contract that translates governed prompt/model requests into OpenRouter chat completions and normalizes responses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adapter unit tests cover successful OpenRouter responses, missing credentials, HTTP errors, malformed payloads, and empty assistant content.
- **SC-002**: The AI package test suite, type-check, lint, and staged F12 dev run pass without live OpenRouter credentials.
- **SC-003**: `.env.example` regenerates from the shared schema with OpenRouter variables and no drift.
- **SC-004**: Runbook setup instructions identify `OPENROUTER_API_KEY` as the production provider key and explain that model profiles/manifests should allow provider `openrouter`.

## Assumptions

- The first OpenRouter integration is non-streaming chat completions only.
- Model selection remains governed by F12 model profiles and manifests; this feature does not choose a default production model.
- Live OpenRouter smoke testing waits until the user supplies an API key in local and Vercel environments.
- The old `AI_GATEWAY_API_KEY` may remain temporarily as legacy/deprecated config if removing it would break unrelated deployment state.
