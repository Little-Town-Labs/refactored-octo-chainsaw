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
- A governed invocation surface with OpenRouter and fake gateway support.
- Cost-control, provider/model allowlist, usage-metadata, and scoped
  review helpers.
- Direct-provider import boundary scanning.

Provider SDKs must not be imported by advocate or Parley packages. Model
traffic goes through this package so prompt/model refs, manifests, cost
evidence, and audit refs stay reconstructable.

## Gateway Binding Guidance

Live provider calls currently use `OpenRouterGatewayAdapter`, which sends
non-streaming chat completions through OpenRouter behind the existing
F12 gateway contract. Configure it with `OPENROUTER_API_KEY`; optional
`OPENROUTER_BASE_URL`, `OPENROUTER_APP_URL`, and
`OPENROUTER_APP_TITLE` values control endpoint override and attribution
headers.

Model profiles for this path should use provider `openrouter`, and
runtime manifests must include `openrouter` in `provider_allowlist`.
Provider and model selection remain release-controlled F12 artifacts.

## Dependencies

Production gateway binding uses Node `fetch` directly and does not add a
provider SDK dependency. Tests use `FakeGatewayAdapter` and mocked
OpenRouter responses; they must not require live credentials.

`AI_GATEWAY_API_KEY` is legacy Vercel AI Gateway configuration retained
for older deployment state. New provider setup should use OpenRouter
configuration instead.

## Stability tier

Alpha. Prompt/model versioning is a Constitution §I.C.2 commitment;
breaking changes follow Constitution §III.3.
