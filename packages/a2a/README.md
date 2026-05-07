# @spyglass/a2a

**Status:** alpha — F01 placeholder; populated in F21 (Seeker web
surface + A2A agent cards) for v0; A2A receiver projection rules in v1
once external A2A protocol stabilizes.

Google Agent2Agent (A2A) protocol surface. v0 publishes agent cards at
well-known paths; the seeker-delegate JSON-RPC handlers are v1 (PRD
§3.3 Mode 1 only).

## Public API

- Agent-card publication paths (F21).
- JSON-RPC handlers for `seeker-delegate` (v1).

## Dependencies

Will depend on `@spyglass/shared`, `@spyglass/auth`,
`@spyglass/agents` (for the seeker-delegate v1 path).

## Stability tier

Alpha. Per PRD §5.3, A2A endpoints are exposed in v0 but not depended
on for the v0 customer flow.
