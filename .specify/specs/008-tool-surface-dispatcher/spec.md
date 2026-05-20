# Feature Specification: F08.5 Tool Surface & Dispatcher

**Feature Branch**: `008-tool-surface-dispatcher`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Start F08.5: Tool Surface & Dispatcher. Add a versioned tool catalog, per-contract advertisement, disclosure-class routing, dispatcher-only invocation, unsupported-tool graceful degradation, and CI-gated enforcement before the full F08 Parley runner."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Pinned Tool Surfaces for Dispatch (Priority: P1)

As the Parley dispatcher, I need each agent contract's `tool_surface_ref` to resolve to an immutable catalog version, so a run advertises only the exact tools that contract was reviewed and published with.

**Why this priority**: F07a already resolves contracts and treats unavailable tool surfaces as a dispatch blocker. F08.5 supplies that missing dependency before the full F08 runner can safely execute.

**Independent Test**: Resolve a published tool surface by id and version, verify the advertised tool descriptors and provenance, and verify missing, unpublished, deprecated, or mutated catalog versions fail with stable reason codes.

**Acceptance Scenarios**:

1. **Given** a published tool surface version exists, **When** dispatch resolves the contract's pinned `tool_surface_ref`, **Then** the registry returns the immutable catalog version, tool descriptor list, disclosure classes, and audit refs.
2. **Given** a new tool is added to a later catalog version, **When** an older contract resolves its pinned version, **Then** the older contract's advertised tools do not change.
3. **Given** a tool surface reference is missing, unpublished, deprecated, or content-mismatched, **When** dispatch resolves it, **Then** dispatch receives a structured denial and does not advertise tools from that surface.

---

### User Story 2 - Invoke Tools Only Through the Dispatcher (Priority: P1)

As platform security policy, I need side-runner code to invoke tools only through a typed dispatcher, so direct tool calls cannot bypass scope checks, disclosure handling, unsupported-tool behavior, or audit evidence.

**Why this priority**: The roadmap marks direct tRPC/SDK calls from side-runner code as a high-risk bypass that must be rejected at type-check and CI before any Parley runtime work proceeds.

**Independent Test**: Attempt supported, unauthorized, and unsupported tool calls through the dispatcher and verify direct runner imports are rejected by CI/type-level gates.

**Acceptance Scenarios**:

1. **Given** a supported advertised tool call is within the contract's limits and principal scopes, **When** the side runner asks the dispatcher to invoke it, **Then** the dispatcher calls the registered adapter and returns a structured result.
2. **Given** side-runner code attempts to call a tool adapter, tRPC client, or SDK directly, **When** the type-check/CI gate runs, **Then** the build fails with a dispatcher-bypass violation.
3. **Given** a side runner asks for a tool that is not advertised by the resolved surface, **When** the dispatcher evaluates the call, **Then** it returns `tool_unsupported`, records evidence, and allows the turn to continue.

---

### User Story 3 - Enforce Disclosure-Class Routing (Priority: P1)

As privacy and compliance policy, I need every tool output classified and routed by disclosure class, so counterparty-facing data cannot bypass the privacy filter boundary.

**Why this priority**: F08.5 is the first defense-in-depth layer for tool outputs. F09 will implement the no-model privacy filter, but F08.5 must make the routing boundary non-optional now.

**Independent Test**: Dispatch tools with `principal_self`, `counterparty_filtered`, and `platform_open` outputs, verify routing decisions, and verify `counterparty_filtered` outputs cannot be exposed without the privacy-filter interface.

**Acceptance Scenarios**:

1. **Given** a tool descriptor declares `principal_self`, **When** the dispatcher returns output, **Then** the output is available only to the invoking side and is not marked for counterparty exposure.
2. **Given** a tool descriptor declares `counterparty_filtered`, **When** the dispatcher returns output, **Then** the output is handed to the privacy-filter boundary and is not released as a raw counterparty view.
3. **Given** a tool descriptor declares `platform_open`, **When** the dispatcher returns output, **Then** the output may be used by both sides with audit evidence identifying the descriptor and adapter.

---

### User Story 4 - Review Tool Catalog and Dispatch Evidence (Priority: P2)

As an operator or compliance reviewer, I need scoped reads for tool catalog versions and dispatch outcomes, so I can reconstruct what tools were advertised, invoked, refused, and disclosure-routed for a run.

**Why this priority**: Tool use is part of the compliance and incident trail, but review access must be bounded and must not expose raw sensitive tool payloads by default.

**Independent Test**: Query catalog versions, descriptor history, unsupported-tool outcomes, dispatcher-bypass findings, and disclosure-routing evidence with and without review scope.

**Acceptance Scenarios**:

1. **Given** a scoped reviewer requests a catalog version, **When** the review read runs, **Then** it returns descriptor metadata, publication state, content hash, and audit refs without raw secret material.
2. **Given** a scoped reviewer requests tool dispatch outcomes, **When** the review read runs, **Then** it returns stable reason codes, descriptor refs, disclosure classes, and run refs without raw sensitive payloads.
3. **Given** an unscoped actor requests tool catalog or dispatch history, **When** authorization runs, **Then** access is denied by default.

### Edge Cases

- A contract pins a catalog version that exists but contains a descriptor whose adapter is not registered.
- A tool descriptor is renamed without a new version.
- A supported adapter returns data that conflicts with its declared output schema.
- A `counterparty_filtered` output is produced before F09 is fully implemented.
- A side runner tries to import a tool adapter through a transitive package path.
- A tool call exceeds the contract's `max_tool_calls_per_turn`.
- A catalog version is deprecated while historical runs still need reconstruction.
- A tool adapter throws, times out, or returns a retryable error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain immutable tool surface versions addressed by `(surface_id, version)`.
- **FR-002**: System MUST reject attempts to mutate, rename, or overwrite an existing tool surface version or descriptor version.
- **FR-003**: System MUST define each tool descriptor with `name`, `version`, `input_schema`, `output_schema`, `disclosure_class`, adapter reference, status, content hash, and audit evidence.
- **FR-004**: System MUST restrict `disclosure_class` to `principal_self`, `counterparty_filtered`, or `platform_open`.
- **FR-005**: System MUST resolve F07a contract `tool_surface_ref` values at dispatch time and refuse missing, unpublished, deprecated, invalid, or unavailable surfaces with stable reason codes.
- **FR-006**: System MUST preserve per-contract advertisement so contracts pin exact tool versions and are not changed by later catalog additions.
- **FR-007**: System MUST expose a dispatcher API as the only supported path for side-runner tool invocation.
- **FR-008**: System MUST include a CI/type-check gate that rejects direct tool adapter, tRPC, SDK, or equivalent side-runner calls outside the dispatcher path.
- **FR-009**: System MUST validate tool input and output against descriptor schemas before returning a successful dispatch result.
- **FR-010**: System MUST return `tool_unsupported` for calls not advertised by the resolved surface and allow the turn to continue.
- **FR-011**: System MUST enforce principal scope, side, contract, run, and per-turn call-limit checks before invoking a tool adapter.
- **FR-012**: System MUST route tool outputs according to disclosure class and fail closed for `counterparty_filtered` outputs when the privacy-filter boundary is unavailable.
- **FR-013**: System MUST emit canonical audit evidence for surface publication, deprecation, dispatch invocation, unsupported-tool outcomes, disclosure routing, adapter failure, and dispatcher-bypass CI findings.
- **FR-014**: System MUST provide scoped review reads for catalog versions, descriptor history, and dispatch outcomes while denying unscoped reads by default.
- **FR-015**: System MUST keep F08.5 boundaries clear: full Parley orchestration belongs to F08, privacy filtering implementation belongs to F09, and real business tool adapters may be added by later features.

### Key Entities

- **Tool Surface Version**: Immutable catalog artifact containing descriptor refs, publication state, provenance, content hash, and audit refs.
- **Tool Descriptor Version**: Immutable tool definition containing name, version, input/output schemas, disclosure class, adapter ref, status, and content hash.
- **Tool Advertisement**: Dispatch-time list of descriptor versions available to a contract-pinned run side.
- **Tool Dispatch Request**: Invocation request carrying run id, side, contract ref, principal, descriptor ref, input payload, and turn context.
- **Tool Dispatch Result**: Structured outcome for successful, unsupported, denied, filtered-pending, failed, or timeout tool execution.
- **Disclosure Routing Evidence**: Audit-ready record of how a tool output was constrained by `principal_self`, `counterparty_filtered`, or `platform_open`.
- **Dispatcher Bypass Finding**: CI/type-check evidence that side-runner code attempted to reach a tool outside the dispatcher boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A published pinned tool surface resolves deterministically to one catalog definition and descriptor list in every package-level test run.
- **SC-002**: Mutation attempts against an existing `(surface_id, version)` or descriptor `(name, version)` are rejected in tests with stable immutable-version errors.
- **SC-003**: Contract dispatch refuses missing, unpublished, deprecated, invalid, or unavailable tool surfaces using stable reason codes.
- **SC-004**: Direct side-runner tool calls are rejected by the repository's CI/type-check gate.
- **SC-005**: Unsupported tool calls return `tool_unsupported`, produce audit evidence, and do not terminate the turn.
- **SC-006**: `counterparty_filtered` outputs cannot be returned as raw counterparty-visible data in tests.
- **SC-007**: Scoped review reads reconstruct catalog versions and dispatch outcomes without exposing raw sensitive payloads.
- **SC-008**: Initial package verification passes unit tests, type-check, lint, schema-lint, contract schema validation, and an F08.5 staged quickstart run.

## Assumptions

- F07a is merged and owns immutable agent contracts with `tool_surface_ref`; F08.5 owns catalog versions, descriptor bodies, dispatcher invocation, and surface availability checks.
- F07b is merged and provides the precedent for fail-closed compliance dispatch gates and scoped review reads.
- F09 privacy filter is not implemented yet; F08.5 must define and enforce the boundary contract and fail closed for raw `counterparty_filtered` exposure.
- Tool adapters in this feature can be fixtures or test doubles; production business tools can be added later after the dispatcher boundary exists.
- F08.5 is backend/compliance infrastructure and does not add user-facing pages.
