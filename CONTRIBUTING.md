# Contributing to Spyglass

Spyglass is built using **specification-driven development (SDD)** via
[spec-kit](https://github.com/github/spec-kit). Specs are the primary
artifact; code is the implementation output. See
[`PRD.md`](PRD.md), [`.specify/memory/constitution.md`](.specify/memory/constitution.md),
and [`.specify/roadmap.md`](.specify/roadmap.md) for the governing
documents.

This file covers the day-to-day "how do I work here" surface. It is
expanded incrementally as Phase A lands.

## Branch naming

`<feature-id>-<slug>` per the roadmap. Examples:

- `01-monorepo-scaffold` (F01)
- `02-identity-auth-aaa` (F02)
- `04-ticket-store-state-machines` (F04)

## Commit messages — Conventional Commits

Enforced via commitlint (commit-msg hook + CI). Format:

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

Types accepted: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `chore`, `ci`, `build`, `revert`. Add `!` after the type or
include `BREAKING CHANGE:` in the footer for breaking changes.

Header max length: 100 characters.

## Pre-commit hooks (Lefthook)

Installed automatically by `pnpm install` (Lefthook postinstall) or
manually via `pnpm exec lefthook install`. Hooks run in parallel:

| Hook                      | What it does                                    | Why                                              |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `eslint`                  | Lints staged JS/TS files; auto-fixes where safe | NFR-10 (max-lines), boundary enforcement (FR-25) |
| `prettier`                | Format check on staged files                    | Style consistency                                |
| `gitleaks`                | Scans staged content for secrets                | FR-22 — layer 1 of three secret-scan defenses    |
| `type-check-changed`      | TypeScript type-check on changed packages       | Catches type errors before push                  |
| `commitlint` (commit-msg) | Validates commit message format                 | FR-26 (semver discipline)                        |

### Hook bypass policy

`git commit --no-verify` is acceptable on **feature branches** for
in-progress WIP commits — sometimes you need to checkpoint broken code
to ask for help, share a branch, or back up work mid-refactor. That's
fine.

`--no-verify` is **never** acceptable on:

- `main`
- Release branches
- Any branch under code review (PR-attached)

A `--no-verify` commit reaching `main` is a sev-1 process violation
and surfaces as such in the audit trail. The CI gate is the
authoritative defense — Constitution §I.6 (Defense in Depth) — so a
single bypassed local hook is not catastrophic. Repeated bypasses
that produce CI failures are a signal to re-examine the underlying
issue, not to bypass harder.

Per `~/.claude/rules/debugging.md`: pre-commit hook failures are
**investigated**, not bypassed. The hook is a signal.

## Adding a dependency

1. Justify it in the PR description: what problem it solves; what
   alternatives were considered.
2. Add it via `pnpm add <pkg>` at the appropriate scope:
   - Workspace-wide dev tools: `pnpm add -D -w <pkg>`
   - App-specific: `pnpm --filter @spyglass/<app> add <pkg>`
   - Package-specific: `pnpm --filter @spyglass/<pkg> add <pkg>`
3. CI will run vulnerability scans (`pnpm audit` + `osv-scanner`),
   license-allowlist checks, and (per Constitution v2.0.0 §I.C.2)
   upstream-provenance verification where available. Unsigned deps
   without provenance must be added to
   `.specify/exceptions/dependency-signatures.md` with a one-line
   rationale.

## Adding an environment variable

1. Add the field to the Zod schema in `packages/shared/src/env.ts`
   (T019, F01 Phase A4).
2. Run `pnpm gen:env-example` to regenerate `.env.example`.
3. Add the value to Vercel via `vercel env add <NAME>`.
4. Commit the schema change AND the regenerated `.env.example`. CI
   will fail on drift between the two.

## Spec-kit workflow

For any feature involving new files, API endpoints, data models, or
multi-step implementation:

1. `/speckit-specify <id>-<slug>` — define WHAT.
2. `/speckit-clarify` — resolve ambiguities (max 5 Qs).
3. `/speckit-plan` — define HOW.
4. `/speckit-tasks` — break down into ordered tasks.
5. `/speckit-analyze` — cross-artifact consistency check.
6. `/speckit-implement` — TDD-driven execution.
7. `/code-review` + `/security-review` (mandatory for changes
   touching Constitution Articles I, I.A, I.C, I.D).

## Constitutional gates on every PR

Per Constitution §V.3, every PR is checked against:

- **Foundational articles (I, I.A–I.D, II, III)** — violations
  block merge.
- **Disciplinary article IV** — exceptions require inline
  justification in the PR or affected spec.
- **`/security-review`** — mandatory for any change touching
  §I, §I.A, §I.C, or §I.D.
- **Threat model** — required for any feature touching §I or §II
  (STRIDE for security; LINDDUN for privacy).

The PR template (added in Phase A9) surfaces these as checkboxes.
