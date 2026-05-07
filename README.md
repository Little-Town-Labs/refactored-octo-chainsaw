# Spyglass

> Two-sided AI hiring platform for the agentic era. Seeker and
> employer advocates negotiate via the Parley harness; mutual
> threshold clearance escalates to a human introduction.

**Status:** F01 scaffold (in progress). See
[`.specify/roadmap.md`](.specify/roadmap.md) for the 27-feature
implementation plan.

---

## Quick start

```bash
git clone <repo>
cd refactored-octo-chainsaw
# Future: bash scripts/bootstrap.sh (T051, Phase A8)
# For now:
corepack enable
pnpm install
pnpm dev   # apps/web on http://localhost:3000
```

Required tools (the future bootstrap script will install or check
each):

- Node 24 LTS (see `.nvmrc`)
- pnpm 9.x via Corepack
- Vercel CLI (for env management)
- Lefthook (git hook runner)
- Gitleaks (secret scanner; optional locally — CI is the
  authoritative gate)

## Project layout

```
spyglass/
├── apps/
│   └── web/                Next.js 16 App Router shell
├── packages/
│   ├── shared/             env schema, common types
│   ├── parley/             Parley harness (F08+)
│   ├── tickets/            ticket store + state machines (F04)
│   ├── agents/             advocate LLM logic (F13/F14)
│   ├── db/                 Drizzle config + migrations (F03)
│   ├── api-contracts/      OpenAPI specs (F23)
│   ├── a2a/                Agent2Agent server (F21)
│   ├── channels-core/      channel adapter framework (F16)
│   ├── auth/               Clerk + AAA layer (F02)
│   └── ai/                 AI Gateway client (F12)
├── .specify/               spec-kit artifacts (constitution,
│                           roadmap, per-feature specs)
├── docs/                   architecture notes, compliance posture
└── scripts/                bootstrap, gen-env-example,
                            verify-artifact, etc.
```

## Governance documents

These define how Spyglass is built. Read them before contributing.

| Doc | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Product requirements — what we're building and why |
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | Foundational articles every PR is checked against |
| [`.specify/roadmap.md`](.specify/roadmap.md) | 27-feature implementation plan with dependencies |
| [`docs/COMPLIANCE_ARCHITECTURE.md`](docs/COMPLIANCE_ARCHITECTURE.md) | AEDT compliance posture, jurisdictional phasing |
| [`/mnt/f/parley/SPEC.md`](/mnt/f/parley/SPEC.md) | Parley harness specification (separate repo) |

## Development workflow

Spyglass uses **specification-driven development** via
[spec-kit](https://github.com/github/spec-kit). For any feature
involving new files, API endpoints, or multi-step implementation:

1. `/speckit-specify <id>-<slug>` — define WHAT
2. `/speckit-clarify` — resolve ambiguities
3. `/speckit-plan` — define HOW
4. `/speckit-tasks` — ordered task breakdown
5. `/speckit-analyze` — cross-artifact consistency
6. `/speckit-implement` — TDD execution
7. `/code-review` + `/security-review` (mandatory for foundational
   changes)

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, commit
conventions, hook bypass policy, and constitutional gates.

## Common commands

```bash
pnpm dev                  # start apps/web dev server
pnpm build                # build all packages + apps
pnpm test                 # run jest across workspace
pnpm type-check           # tsc --noEmit across workspace
pnpm lint                 # eslint across workspace
pnpm format:check         # prettier --check across workspace
pnpm format               # prettier --write across workspace
pnpm gen:env-example      # regenerate .env.example from Zod schema
```

## Security

See [`.github/SECURITY.md`](.github/SECURITY.md) for vulnerability
reporting. Cross-side privacy filter bypass is a sev-1 incident.

## License

UNLICENSED — proprietary. All rights reserved.
