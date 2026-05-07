# @spyglass/ai

**Status:** alpha — F01 placeholder; populated in F12 (AI
infrastructure: Gateway client, prompt registry, model/prompt
versioning, embeddings).

LLM access layer. Per Constitution §I.C.2 the AI supply chain
(prompts, rubrics, fine-tuned models, model artifacts) is treated as
versioned, signed, SBOM-equivalent — prompt/model/rubric changes are
release events, not configuration edits.

## Public API

To be defined in F12. Will export:

- A typed Vercel AI Gateway client wrapper using AI Gateway model
  strings (`provider/model`).
- A prompt registry — versioned, immutable `(prompt_id, version)`
  pinning, joined to the Agent Contract Registry (F07a).
- An embeddings client.

## F12 implementation guidance (forward-looking)

Per Vercel platform guidance current as of 2026-02-27:

- **Default to AI SDK v6** with AI Gateway model strings; do not wire
  provider SDKs directly.
- **`@ai-sdk/react`** for React hooks where streaming UX is needed.
  Keep user-facing AI experiences streaming-first.
- **Modern tool definitions** with `inputSchema` / `outputSchema`;
  use `toUIMessageStreamResponse()` and `DefaultChatTransport` over
  v5-era patterns.
- AI recommendations are scoped to the current task — no forced
  migrations across the broader stack.

These guidelines are recorded here in F01 so the F12 spec can pick
them up rather than re-derive them.

## Dependencies

`ai` (Vercel AI SDK v6+), `@ai-sdk/react`, AI Gateway provider
configuration. Will depend on `@spyglass/shared`.

## Stability tier

Alpha. Prompt/model versioning is a Constitution §I.C.2 commitment;
breaking changes follow Constitution §III.3.
