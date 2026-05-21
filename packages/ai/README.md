# @spyglass/ai

**Status:** alpha — F12 AI infrastructure slice.

LLM access layer. Per Constitution §I.C.2 the AI supply chain
(prompts, rubrics, fine-tuned models, model artifacts) is treated as
versioned, signed, SBOM-equivalent — prompt/model/rubric changes are
release events, not configuration edits.

## Public API

F12 exports:

- Immutable prompt and model profile registries.
- Signed AI runtime manifest helpers with no-hot-reload posture.
- Prompt rendering with variable-contract validation and sentinel
  preservation.
- A governed invocation surface with fake gateway support for tests.
- Cost-control, provider/model allowlist, usage-metadata, and scoped
  review helpers.
- Direct-provider import boundary scanning.

Provider SDKs must not be imported by advocate or Parley packages. Model
traffic goes through this package so prompt/model refs, manifests, cost
evidence, and audit refs stay reconstructable.

## Gateway Binding Guidance

Per Vercel platform guidance current as of 2026-02-27:

- Default to AI SDK v6 with AI Gateway model strings; do not wire
  provider SDKs directly.
- `@ai-sdk/react` for React hooks where streaming UX is needed.
  Keep user-facing AI experiences streaming-first.
- Modern tool definitions with `inputSchema` / `outputSchema`;
  use `toUIMessageStreamResponse()` and `DefaultChatTransport` over
  v5-era patterns.
- AI recommendations are scoped to the current task — no forced
  migrations across the broader stack.

These guidelines are recorded here in F01 so the F12 spec can pick
them up rather than re-derive them.

## Dependencies

Production gateway binding may add `ai` and related AI Gateway packages
behind the adapter in this package. Tests use `FakeGatewayAdapter` and
must not require live credentials.

## Stability tier

Alpha. Prompt/model versioning is a Constitution §I.C.2 commitment;
breaking changes follow Constitution §III.3.
