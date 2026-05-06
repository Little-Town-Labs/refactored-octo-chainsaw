# @spyglass/agents

**Status:** alpha — F01 placeholder; populated in F13 (seeker
advocate) and F14 (employer advocate).

Seeker and employer advocate LLM logic — prompts, scoring against
versioned rubrics, tool wiring. Each agent operates against a versioned
`AgentContract` (Parley §4.1.2) and produces deterministic
per-dimension scores against a versioned rubric (Parley §5.4).

## Public API

To be defined in F13/F14. Will export the seeker- and employer-side
agent driver functions consumed by the Parley runner (`@spyglass/parley`).

## Dependencies

Will depend on `@spyglass/shared`, `@spyglass/ai`,
`@spyglass/parley` (interfaces only).

## Stability tier

Alpha through Phase 0 alpha; eval-harness gates promotion.
