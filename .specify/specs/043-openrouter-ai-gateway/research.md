# Research: F12 Follow-up OpenRouter AI Gateway

## Decision: Use raw HTTP `fetch` against OpenRouter chat completions

**Rationale**: OpenRouter documents a standard HTTP API at `https://openrouter.ai/api/v1/chat/completions` with OpenAI-compatible request and response shapes. Using raw `fetch` avoids adding a provider SDK dependency and keeps the F12 import-boundary posture simple.

**Alternatives considered**:

- OpenRouter SDK: rejected for now because this feature only needs one non-streaming endpoint and dependency minimization is part of F12 supply-chain control.
- OpenAI SDK pointed at OpenRouter: rejected for now because it adds an indirect provider client dependency where raw HTTP is sufficient.

## Decision: Use server-only `OPENROUTER_API_KEY`

**Rationale**: OpenRouter authenticates API calls with Bearer tokens. The key must be kept out of client bundles and supplied through deployment secrets.

**Alternatives considered**:

- Reuse `AI_GATEWAY_API_KEY`: rejected because the name points operators at the wrong provider and caused setup ambiguity.
- Public client key: rejected because provider keys are server secrets.

## Decision: Preserve F12 model profile provider enforcement

**Rationale**: Existing F12 manifests enforce `provider_allowlist` before invoking a gateway. OpenRouter should be represented as provider `openrouter` in model profiles and manifests rather than bypassing allowlists.

**Alternatives considered**:

- Treat OpenRouter as a transparent transport while preserving upstream provider names: rejected for this first slice because it would make provider allowlists ambiguous.

## Decision: Defer live smoke testing until credentials are supplied

**Rationale**: CI and local verification must stay deterministic and must not require live provider keys. Unit tests can mock `fetch` and validate request/response behavior.

**Alternatives considered**:

- Live OpenRouter test in CI: rejected because it would require paid credentials and increase flake risk.
