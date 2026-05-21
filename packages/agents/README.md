# @spyglass/agents

**Status:** alpha — F13 seeker advocate in progress; F14 employer
advocate follows as a separate feature.

Seeker and employer advocate LLM logic — prompts, scoring against
versioned rubrics, tool wiring. Each agent operates against a versioned
`AgentContract` (Parley §4.1.2) and produces deterministic
per-dimension scores against a versioned rubric (Parley §5.4).

## Public API

F13 exports the seeker-side agent driver functions consumed by the Parley
runner (`@spyglass/parley`). The implementation is intentionally
seeker-only: employer-side advocate behavior remains F14.

## Dependencies

Depends on `@spyglass/ai` for all governed model invocation, plus
Parley, contract, rubric, privacy-filter, and tool-dispatcher types.
Provider SDKs must not be imported here.

## Stability tier

Alpha through Phase 0 alpha; eval-harness gates promotion.
