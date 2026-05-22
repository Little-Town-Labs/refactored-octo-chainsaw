# @spyglass/agents

**Status:** alpha — F13 seeker advocate and F14 employer advocate are implemented as package-level Stage 5 baselines.

Seeker and employer advocate LLM logic — prompts, scoring against versioned rubrics, tool wiring. Each agent operates against a versioned `AgentContract` (Parley §4.1.2) and produces deterministic per-dimension scores against a versioned rubric (Parley §5.4).

## Public API

F13 exports the seeker-side agent driver functions consumed by the Parley runner (`@spyglass/parley`).

F14 exports the employer-side agent driver functions with parallel invariants plus employer-specific regulated-surface controls: rubric bias-gate evidence, protected-class boundary refusal, decision-content refusal, filtered seeker projection enforcement, and F12-only model invocation.

F15 renegotiation, F22 employer admin, and F23 employer REST/webhook surfaces remain outside this package slice.

## Dependencies

Depends on `@spyglass/ai` for all governed model invocation, plus Parley, contract, rubric, privacy-filter, and tool-dispatcher types. Provider SDKs must not be imported here.

## Stability tier

Alpha through Phase 0 alpha; eval-harness gates promotion.
