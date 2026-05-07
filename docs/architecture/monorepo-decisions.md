# Monorepo Decisions

Why Spyglass is a single pnpm + Turborepo monorepo, with notes on the
package boundary discipline that keeps it maintainable.

## Why monorepo

PRD §7 commits the structure. The reasons:

- **27 features** (per `.specify/roadmap.md`) span backend (Parley
  harness, ticket store, agents), frontend (web shell, employer
  console, channels), and shared infrastructure (auth, AI, env).
  Polyrepo at this scale = synchronization tax on every cross-cutting
  change.
- **Atomic refactors.** A change to the channel adapter interface
  (F16) immediately surfaces in every channel implementation
  (F17–F19) at type-check time. In a polyrepo, that's a multi-day
  fan-out.
- **Single CI pipeline.** Constitution §V.3 requires PR-time gates
  on every change; the gates run once, against the full graph.

## Why Turborepo (not Nx, Bazel)

PRD §7 commits Turborepo. Tradeoffs:

- **Pros:** First-class Vercel integration; remote caching free
  on Vercel; declarative `turbo.json`; minimal config.
- **Cons:** Less powerful than Nx for cross-language graphs (we
  don't need that); over-engineered for a 12-package tree.
- **Alternatives:** Nx is heavier and plugin-driven. Bazel is for
  graphs we don't have.

## Why pnpm (not npm, yarn)

PRD §7 + spec Clarification 3.

- **Disk efficiency.** Content-addressable store; one copy of each
  package version on disk regardless of how many workspaces
  consume it.
- **Strict resolution.** No phantom deps — packages can only
  import what they explicitly declared. Aligns with FR-25 (boundary
  enforcement) at the package-manager layer.
- **Workspace support.** First-class; `--filter` selects subgraphs
  cleanly.

## Package boundaries (three layers, per Research D16)

Spec NFR-25 requires deep imports across packages to be rejected.
Three independent enforcement layers (Constitution §I.6 Defense in
Depth):

1. **`package.json#exports`** — runtime + bundler-level barrier.
   `@spyglass/parley` exports `./` only; consumers can't import
   `@spyglass/parley/dist/internal/...`.
2. **ESLint `import/no-internal-modules`** — lint-time visibility.
   Catches deep imports during PR review, before runtime.
3. **`publint`** — CI-time validation that `package.json` itself
   correctly declares its `exports` map.

Plus **TypeScript project references** (Research D12) compile each
package independently; cross-package type errors surface immediately.

## Why TypeScript project references (`composite: true`)

- Cached incremental builds — Turborepo dovetails with `tsc`'s
  build cache.
- Type-level enforcement of declared dependencies (FR-25, FR-26).
- A foundation for `@spyglass/<pkg>` exports being typecheck-
  verified without deep imports.

`packages/*` set `"composite": true`. `apps/*` consume via project
references. Strict mode (`"strict": true`,
`"noUncheckedIndexedAccess": true`,
`"exactOptionalPropertyTypes": true`,
`"verbatimModuleSyntax": true`) is on globally; per-package opt-out
requires a recorded exception.

## Apps don't depend on apps (FR-5)

ESLint `boundaries/dependencies` rule rejects any import path
where `from = app` and `to = app`. Inter-app sharing must go through
a `packages/*` package.

This is a PR-time check; the `package.json#exports` of an `apps/*`
package isn't published, so it can't be imported anyway in
practice — but the lint rule catches it earlier and with a clearer
message.

## Naming conventions

- Workspace packages: `@spyglass/<purpose>` (e.g., `@spyglass/parley`).
- Apps: `@spyglass/<app-name>` (e.g., `@spyglass/web`).
- File-size limit: 800 lines (NFR-10), enforced via ESLint `max-lines`.
  Test files exempt.

## What's NOT a monorepo decision

- **Database schema** — F03 owns. The shape lives in
  `packages/db/src/schema.ts` (not yet created).
- **API contracts** — F23 owns; OpenAPI 3.1 specs live in
  `packages/api-contracts/openapi/` (not yet created).
- **Agent prompts / rubrics** — F12+ own; treated as supply chain
  per Constitution §I.C.2 (versioned, signed, SBOM-equivalent).

## Open questions

- **Long-term Drizzle vs. Prisma.** Drizzle was committed in PRD §7;
  no plan to revisit. Open in case operational pain surfaces.
- **Shared eslint config as a published package?** Not yet — config
  is at the workspace root and applies everywhere. If we ever want
  to use the same rules in a sibling repo, we'd promote.
