# Feature Specification: PTH15 Eval Trend and Cost Monitoring

**Feature Branch**: `040-product-harness-eval-trends`
**Created**: 2026-05-28
**Status**: Implemented
**Input**: Product harness roadmap PTH15: persist persona eval cost, latency, outcome, and drift trends while keeping evals informational.

## User Scenarios & Testing

### Primary User Story

As a Spyglass operator reviewing persona eval reports, I need cost, latency, outcome, tool-refusal, model/provider, and evaluator-score trends to be visible and persisted in reports so the team can later decide whether any eval should become release-blocking.

### Acceptance Scenarios

1. **Given** persona eval snapshots with agent invocation metadata, **When** a product harness suite report is generated, **Then** the JSON report includes eval trend points for each eval run.
2. **Given** persona eval report Markdown is rendered, **When** eval trend points exist, **Then** the report includes an Eval Trends section with cost, latency, outcome, provider/model, and refusal count summaries.
3. **Given** eval runs are informational, **When** trends include high cost, high latency, or refusal outcomes, **Then** report status remains derived from run/assertion status and no new release-blocking gate is introduced.
4. **Given** local tests run without Pi credentials, **When** eval trend tests execute, **Then** they use deterministic synthetic persona eval snapshots.
5. **Given** persona eval sample output is generated, **When** it is parsed by CI, **Then** it includes a compact trend summary alongside existing outcomes and persistence counts.

### Edge Cases

- Snapshots with no agent invocations produce no eval trend points.
- Missing or malformed invocation metadata is ignored rather than causing report generation to fail.
- Cost and latency totals are deterministic numeric values.
- Trend output must not include transcript excerpts, prompt payloads, or raw model messages.

## Requirements

### Functional Requirements

- **FR-001**: The harness MUST expose eval trend summary helpers over `ProductResultStoreSnapshot` inputs.
- **FR-002**: Eval trends MUST include run id, scenario id, created time, provider, model, model version, outcome, status, latency, cost, token usage, tool refusal count, and evaluator score when present.
- **FR-003**: Suite reports MUST include eval trend points in JSON output.
- **FR-004**: Markdown reports MUST render eval trend summaries when eval trend points exist.
- **FR-005**: Persona eval sample output MUST include aggregate trend totals for cost, latency, outcomes, providers/models, and refusal count.
- **FR-006**: Eval trends MUST remain informational and MUST NOT alter suite status derivation.

### Non-Functional Requirements

- **NFR-001**: Unit tests MUST be deterministic and must not require live Pi/model credentials.
- **NFR-002**: Trend output MUST exclude transcript excerpts, prompt content, raw tool payloads, and secret-bearing metadata.
- **NFR-003**: Existing report schema compatibility MUST be preserved by adding optional/additive fields only.
- **NFR-004**: Trend calculations MUST tolerate older snapshots that lack PTH15 metadata.

## Success Criteria

- **SC-001**: Tests cover eval trend extraction, aggregate summaries, report JSON/Markdown rendering, informational status behavior, and sample output.
- **SC-002**: `product:eval` reports expose trend data without changing release gate behavior.
- **SC-003**: Existing reporting and persona eval tests continue to pass.
- **SC-004**: Roadmap and Spec Kit artifacts identify PTH15 as the active implementation slice.
