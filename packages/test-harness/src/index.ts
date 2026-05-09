// `@spyglass/test-harness` — shared integration-test infrastructure.
//
// Provides:
//   - `NeonBranchManager`: copy-on-write Postgres branches per test
//     run (fast isolation, real engine — no pg-mem drift).
//   - `applyMigrations`: drizzle-kit migration runner against a URL.
//   - `InMemoryAuditSink`: assertable double for `AuditEventSink`.
//   - `FakeClock`: deterministic time control for expiry tests.
//
// Scenarios live in their owning package (e.g.
// `packages/auth/tests/integration/scenario-5.integration.test.ts`)
// and consume this harness rather than reinventing in-memory mocks.

export type { NeonBranch, NeonBranchManagerOptions } from "./neon.js";
export { NeonBranchManager, NeonApiError } from "./neon.js";

export { applyMigrations } from "./migrate.js";

export type { RecordedAuditEvent } from "./audit-sink.js";
export { InMemoryAuditSink } from "./audit-sink.js";

export { FakeClock } from "./clock.js";
