# Project Spyglass — Product Requirements Document

**Status:** Draft v0.1 · INTERNAL
**Date:** 2026-05-05
**Owner:** Gary
**Reviewers:** Austin

> **Naming note.** This product was previously called *JobBobber* in earlier
> internal docs (including the ticket-lifecycle deck). It is being renamed to
> **Project Spyglass** — or simply **Spyglass**. References to JobBobber in
> prior artifacts should be read as Spyglass.

---

## 1. Summary

**Spyglass is a two-sided AI hiring platform for the agentic era.** It replaces
the LinkedIn / Indeed / Hired sourcing model with a system where an AI agent
acting as the seeker's advocate negotiates structured fit conversations with an
AI agent acting as the employer's advocate. Each side independently scores the
fit against its own versioned rubric. Only when both sides clear human-set
thresholds does a pairing escalate to interview-ready introduction.

The product is **API-first and channel-mediated**. There is no LinkedIn-style
browse-and-apply UX. Seekers interact through conversational channels
(Telegram, email, minimal web chat). Employers interact through a thin admin
console plus REST/webhook APIs and (forward-looking) Google A2A.

The platform is built on top of [**Parley**](https://github.com/Little-Town-Labs/parley) —
the agent-negotiation harness specification — which Spyglass is the first
consuming product of.

---

## 2. Problem & Positioning

### 2.1 The problem

Today's hiring market for white-collar roles fails both sides:

- **Seekers** broadcast resumes into ATS pipelines, get filtered by keyword
  matchers, and either hear nothing or get cold-outreach from recruiters who
  haven't read past their job title. Salary, remote, growth, and culture
  preferences surface only after weeks of email tag.
- **Employers** post reqs to job boards, drown in unqualified applicants, and
  pay sourcing agencies or LinkedIn Recruiter to find candidates who already
  exist in their applicant tracking system but were missed.

Both sides are doing low-leverage work that an agent could do for them — *if*
the agents on both sides can talk to each other through a structured,
auditable, privacy-respecting protocol.

### 2.2 What Spyglass is

Spyglass is a **sourcing-and-pre-qualification platform**, not a screening tool.

- **Seekers** sign up, hand over their profile (resume import or
  conversational onboarding), and tell their agent what kinds of opportunities
  they want to hear about.
- **Employers** sign up, define the company (perks, culture, mission) and open
  reqs, set thresholds for what they want to see, and either watch the
  console or wire up webhooks/A2A to push interview-ready candidates into
  their ATS.
- Two agents negotiate. Two scores get computed. Two thresholds get checked.
  Only mutual clearance escalates to a human introduction.

### 2.3 Competitive lane

| Lane                              | Players (saturated)                  | Spyglass posture |
|-----------------------------------|--------------------------------------|------------------|
| ATS / screening                   | Greenhouse, Lever, Workday, iCIMS    | We integrate, we don't compete |
| AI screening on top of ATS        | Eightfold, Beamery, Phenom, Paradox  | We do not compete here |
| Sourcing                          | LinkedIn Recruiter, Hired, Indeed    | **This is our lane** |
| Cold-outreach automation          | Gem, Loxo, hireEZ                    | We do not compete here |

Our wedge in the sourcing lane is **agent-mediated outreach + pre-qualification**,
not better filters or better cold DMs.

### 2.4 The moat

Two reinforcing moats:

1. **Seeker network.** Seekers sign up directly with Spyglass — they are not
   pulled from someone else's ATS. This network cannot be replicated by buying
   API access.
2. **Negotiation quality.** The protocol, rubrics, privacy filter, threshold
   mechanics, and explanation surface together produce match quality nobody
   else can replicate without rebuilding the agent platform.

The API surface is the **integration channel**, not the moat.

---

## 3. Users

The two sides are **architecturally symmetric** at the data layer (both are
tickets) but **deeply asymmetric** in product surface.

### 3.1 Seeker

- One human. One resume. One job search.
- No engineering team. No developer to wire webhooks. No seeker API key in v0.
- Engages through conversational channels (Telegram, email, web chat) — or,
  for technical seekers in v1, through their own personal agent acting as a
  smart channel.
- Spyglass owns the seeker's experience end to end.
- The Spyglass-hosted seeker-agent is always the advocate doing the
  negotiation. **There is no path where an external agent replaces the
  Spyglass seeker-agent in the negotiation itself.** See §3.3 for the BYO
  agent posture.

### 3.3 BYO seeker agent — Mode 1 only (v1 roadmap)

Some technical seekers will already have a personal agent (e.g., OpenClaw or
similar) and will want it to handle their job search alongside everything
else it does for them. Spyglass supports this in **Mode 1 only**:

- **Mode 1 (mediator).** The seeker's external agent connects to Spyglass
  via A2A and acts as a smart channel — it talks to *our* hosted
  seeker-agent on the seeker's behalf, the same way Telegram or email do,
  but with persistence and judgment. The Spyglass seeker-agent is still the
  advocate that negotiates with employer agents. We remain the AEDT
  operator. The privacy filter, rubric, and audit trail remain ours.
- **Mode 2 (replacement) is explicitly not on the Spyglass roadmap.** We
  will not support an external agent acting *as* the seeker-side advocate
  in the negotiation itself. Someone else can build that product on top of
  our A2A surface; we will not.

Mode 1 is **v1, not v0.** v0 channels are Telegram + email + web chat. The
A2A `seeker-delegate` agent card and OAuth/API-key auth flow ship after v0
launch.

### 3.4 Product philosophy — deliberately not SaaS

Spyglass resists the slippery slope to a full SaaS web surface for seekers.
The seeker's product is the conversation, not a dashboard. Specifically:

- **No seeker dashboard, no ticket list UI, no analytics views, no
  recommended-jobs grid.** Anything a seeker needs to know or decide
  surfaces through the conversational channel, on the agent's initiative.
- **Account management is Clerk-only** — landing page, signup/login,
  profile (resume, preferences, threshold, channel links, pause/resume).
  That is the entire web surface a seeker ever sees.
- **Adding a dashboard is the slippery slope toward becoming LinkedIn.**
  Hold the line.

### 3.2 Employer

- An organization with multiple seats (admin, recruiter, hiring manager, readonly).
- Has an ATS already (Greenhouse, Lever, Ashby, Workday, iCIMS most common).
- May or may not have engineering capacity to integrate.
- Engages through:
  - Thin admin console (always available, no integration required)
  - REST API + webhooks (for ATS push-back)
  - Google A2A (forward-looking, when ATS vendors ship A2A endpoints)
- Their agent is **hosted by Spyglass by default**. BYO via A2A is a v1+ feature.

---

## 4. The Core Mechanic — Two-Sided Agent Negotiation

This is the product. Everything else is plumbing around it.

### 4.1 Agents are advocates, not matchmakers

The seeker agent works for the seeker. The employer agent works for the
employer. Spyglass is not a neutral arbitrator. There is no shared "objective"
match score and we never present one.

### 4.2 Two scores, not one

Each agent scores the fit against **its own versioned rubric**, from its
principal's perspective. A pairing might score 6.5 on the seeker side
(comp, growth, culture, commute) and 4.2 on the employer side (skills depth,
retention risk, salary band fit). Both scores are recorded; neither is the
"truth."

### 4.3 Thresholds are human-set per ticket

The seeker says "wake me up for a 5 or higher." The employer says "I want 7s
for senior, 5s for junior." Thresholds live on the seeker ticket and the
employer ticket. The platform never sets them.

### 4.4 Privacy filter enforces negotiation posture

Each agent has private knowledge about its principal that does **not** cross
the wire:

- Seeker agent never reveals: desperation, gap reasons, salary floor,
  competing offers (unless explicitly asked to disclose), prior rejections.
- Employer agent never reveals: pressure to fill, attrition signals, internal
  comp band ceiling, candidates already passed on this req.

The privacy filter is **not** just PII redaction. It is the mechanism that
keeps each agent in good-faith negotiating posture for its principal.

### 4.5 Score calibration

We do **not** attempt platform-wide absolute calibration. Scores are personal
to each ticket, learned through the principal's feedback. Agents annotate
scores with population context ("this is a 6.5 for you; population median for
comparable reqs is 5.2") to give signal without overclaiming objectivity.

### 4.6 Asymmetric outcomes

When the threshold check produces an asymmetric result:

- **Both clear** → escalate to both humans. Both parent tickets advance to
  `In conversation`.
- **One clears** → surface to the cleared side; match ticket stays warm.
  Cleared side may push back, triggering a re-negotiation loop (cap ~3 rounds).
  The non-cleared side hears nothing per-event by default; their agent
  surfaces *patterns* in aggregate ("you're scoring 3-4 with employers for
  senior IC roles — let's look at why") and offers per-event feedback as
  opt-in.
- **Neither clears** → close silently. Log the negotiation for learning and
  audit.

### 4.7 Re-negotiation loop

If one side clears and pushes back on the other side's no, the match ticket
re-opens for additional turns. Cap at ~3 rounds total before forced
termination. Agents may use additional disclosure (within privacy-filter
bounds) or surface alternative framings.

### 4.8 Defensibility — non-negotiable, day one

Bias auditing, rubric versioning, hash-chained audit logs, dossier signing,
and explanation surfaces are **day-one investments**, not v1 retrofits. NYC
Local Law 144, EEOC, EU AI Act, Colorado SB 205, Illinois HB 3773, and
California FEHA each impose distinct obligations on automated employment
decision tools. The employer-side rubric is the legally regulated surface.

**Compliance is harness policy, not bolt-on features.** The Parley harness
must support compliance obligations as configurable policy from day one — not
as a separate system layered on top. See `docs/COMPLIANCE_ARCHITECTURE.md`
for the full posture; the five harness primitives required from day one are:

1. **Jurisdiction tagging** on every match ticket — seeker's work
   jurisdiction, employer's hiring jurisdiction, and the locus of the hiring
   decision (these can differ for remote roles).
2. **Per-jurisdiction policy gates** — before a match transitions out of
   `Negotiating` and before a dossier is delivered, the harness checks
   whether the jurisdiction is in the active set and whether
   jurisdiction-specific obligations are satisfied. Failure mode is a
   structured failure dossier, never a silent skip.
3. **Bias-audit-ready dossier shape** — the dossier records rubric version,
   prompt version, per-dimension scores; it must be joinable to
   demographic data when seekers consent to provide it. Sensitive — segregated
   storage and access controls — but the *capability* is present from day one.
4. **Candidate notification artifacts** — NYC's 10-day notice, Illinois's
   notification rules, EU AI Act transparency. Each notification produces a
   structured artifact tied to the match ticket (timestamp, recipient,
   version of notice text). Same proof-of-work pattern as the dossier.
5. **Geographic kill switches** — per-jurisdiction toggles flippable without
   a deploy. New law passes, 60-day clock starts, kill switch goes off until
   compliance is in place.

These primitives are first-class concerns of the Parley harness, alongside
the rubric, the privacy filter, and the dossier itself. They are not v1
retrofits.

### 4.9 Compliance-as-UX

Several already-planned product features double as compliance coverage:

- **Aggregate insight reports to seekers** ("24 evaluations this week — 16
  manufacturing, 4 insurance, 4 banks") partially satisfy NYC LL144 candidate
  disclosure obligations.
- **Threshold check-in proposals** ("no 7s yet, want to see 6s?") give
  seekers visible agency, useful for EU AI Act human-oversight obligations.
- **Encouraging feedback with data** ("you're showing promise in healthcare
  based on 30 evaluations") provides transparent feedback about how the
  system treats the seeker — closer to what regulators want than
  minimal-disclosure approaches.

Compliance posture and user experience are aligned, not in tension.

---

## 5. Architecture Overview

```
   Seeker web surface  ┌──────────────────────────────────────────┐
   (account only,      │  Landing page · /agents.md · /llms.txt   │
    not the product)   │  Clerk signup/login · Clerk profile      │
                       │  A2A agent cards (well-known paths)      │
                       └──────────────────────────────────────────┘

   Seeker channels    ┌──────────────────────────────────────────┐
   (the product)      │  Telegram · email · web chat             │
                      │  BYO agent via A2A (v1, Mode 1 only)     │
                      └──────────────────┬───────────────────────┘
                                         │
   Employer surfaces  ┌──────────────────┴──────────────────┐
                      │  Admin console · REST + webhooks    │
                      │  Google A2A (forward-looking, v1+)  │
                      └──────────────────┬──────────────────┘
                                         │
   ┌───────────────────────────────────▼────────────────────────────┐
   │                     Spyglass Core                              │
   │                                                                │
   │   ┌──────────────────────────────────────────────────────────┐ │
   │   │  Issue tracker — system of record                        │ │
   │   │  seeker tickets · employer tickets · match tickets       │ │
   │   │  events · transitions · hash-chained audit log           │ │
   │   └────────────────────┬─────────────────────────────────────┘ │
   │                        │                                       │
   │   ┌────────────────────▼─────────────────────────────────────┐ │
   │   │  Parley harness (engine for match tickets)               │ │
   │   │  runner · privacy filter · rubric registry · audit log   │ │
   │   │  dossier builder + signer                                │ │
   │   └────────────────────┬─────────────────────────────────────┘ │
   │                        │                                       │
   │   ┌────────────────────▼─────────────────────────────────────┐ │
   │   │  Agents — seeker advocate + employer advocate            │ │
   │   │  prompts · tools · scoring against versioned rubrics     │ │
   │   └──────────────────────────────────────────────────────────┘ │
   └────────────────────────────────────────────────────────────────┘
```

**The agent platform is the moat. The ticket model is the spine. The API
surface is the integration channel.**

### 5.1 Tickets at the center

All product entities are tickets or events on tickets:

- `seeker_ticket` — opens at sign-up, closes at hire/withdrawal.
- `employer_req_ticket` — opens at req post, closes at fill/cancel/expire.
- `match_ticket` — spawned when a seeker ticket pairs with an employer ticket;
  carries the agent-to-agent negotiation, both scores, threshold decisions.

A seeker ticket can spawn many match tickets in parallel. So can an employer
ticket. Each match ticket links to exactly one of each.

State machines (from the ticket-lifecycle deck):

- **Seeker:** `Open → Active ⇄ Paused → In conversation → Hired | Closed (withdrawn/churned)`
- **Employer:** `Open → Active ⇄ On hold → In conversation → Filled | Closed (cancelled/expired)`
- **Match:** `Created → Negotiating → Scored → {Both | One | Neither cleared} → Resolved (hire) | Stalled/re-opened | Closed`

### 5.2 Parley as the engine

Parley runs match tickets. Seeker and employer tickets are pre-Parley plumbing.
The match ticket *is* the Parley run container. Parley owns:

- Round-bounded negotiation execution
- Privacy filter enforcement
- Rubric version pinning
- Hash-chained audit log writes
- Dossier assembly + signing

Internal (Parley → tickets) writes go through the ticket store. External
delivery (dossier → employer) goes through webhooks / A2A / console.

### 5.3 Channels

Channel adapters are thin transports. They translate the user's
channel-specific message format into the canonical agent-conversation envelope
and back. All channels conform to a shared `ChannelMessage` interface.

v0 channel scope:

- **Telegram** — primary seeker conversational channel
- **Email** — fallback / async-friendly seeker channel
- **Web chat** — first-touch from marketing site (Clerk-authenticated)
- **Admin console** — employer-side
- **REST + webhooks** — employer integration
- **A2A endpoints** — exposed for future use; not depended on for v0 customer flow

v0 web surface scope (seeker side, account management only — **not a product
dashboard**):

- **Landing page** with marketing content for humans **and**
  agent-readable instructions (`agents.md` / `llms.txt`) describing what
  Spyglass is, how to onboard, and where the A2A agent cards live.
- **Clerk-hosted signup/login**.
- **Clerk-hosted user profile** for resume upload, preferences, threshold
  tuning, channel links/verification, pause/resume, A2A delegate
  registration (when Mode 1 ships in v1).
- **A2A agent cards** at standard well-known paths.

There is no seeker dashboard, ticket list, or analytics UI. See §3.4.

---

## 6. v0 Scope

> **v0 ≡ Phase 1** in the compliance phase plan: 3–5 US states with no
> AEDT-specific law. Phase 0 (private alpha) precedes v0 launch and uses the
> same code with explicit consent banners and "no production hiring decisions"
> posture. See §6.4 for the full phase plan.

### 6.1 Must ship

**Seeker side (channels — the product):**
- Conversational onboarding (Telegram + email + web chat)
- Resume import + conversational profile completion
- Threshold tuning conversation
- Match notifications via channel (when threshold clears)
- Match dossier review via channel
- Pause / resume / withdraw via channel
- Aggregate insight reports ("N evaluations this week, top score X.X")
- Optional opt-in for demographic data collection (segregated storage)
- Work-jurisdiction attestation at signup

**Seeker side (web — account management only, not the product):**
- Landing page with marketing content + `agents.md` / `llms.txt` for agents
- Clerk signup/login
- Clerk profile (resume, preferences, threshold, channel verification,
  pause/resume)
- A2A agent cards published at well-known paths
- **No** dashboard, ticket list, analytics, or recommended-jobs UI

**Employer side:**
- Admin console: company profile, req creation, threshold setting, candidate inbox
- Req creation also possible via REST API
- Match notifications via webhook
- Match dossier delivery via webhook (signed)
- Close req as filled / cancelled
- Hiring-jurisdiction attestation per req (and decision-locus capture)

**Core platform:**
- Three ticket types with state machines and transitions
- Parley harness implementation per SPEC.md (matched against the
  agent-contract, run-state-machine, privacy-filter, audit-log, and
  rubric-versioning sections)
- Privacy filter enforcing negotiation posture
- Hash-chained audit log
- Rubric registry with versioned platform-default rubrics per job family
- Bias-test artifacts for each shipped rubric version
- Dossier builder + signer
- Inngest-backed durable run state machine
- Auth via Clerk (orgs for employer side, single-user for seeker side)

**Compliance harness primitives** (per `docs/COMPLIANCE_ARCHITECTURE.md`):
- Jurisdiction tagging on every match ticket (seeker work + employer hiring + decision locus)
- Per-jurisdiction policy gates with structured failure dossiers
- Bias-audit-ready dossier shape, joinable to consented demographic data
- Candidate notification artifacts (structured, versioned, ticket-linked)
- Geographic kill switches (per-jurisdiction, no deploy required to flip)

### 6.2 Explicitly out of scope for v0

- WhatsApp channel (v1)
- BYO seeker agent via A2A — Mode 1 is **v1**, not v0
- BYO employer agent via A2A (v1+)
- ATS push connectors (Greenhouse / Lever / etc.) — webhooks only at v0;
  customers wire the rest themselves
- Any seeker-side API or developer surface
- Multi-language / non-English
- Geographies outside US (US-only labor market in v0)
- Bidirectional ATS sync (one-way push only at v0)
- Mobile apps (web mobile-friendly is enough)
- Payments, subscriptions, billing infrastructure (manual contracts in v0)
- Native CRM / pipeline tools (we hand candidates off, we don't replace
  recruiter tools)
- Public seeker profile pages (LinkedIn analog) — we are not LinkedIn
- Job board / browse UX — there is none
- **Seeker dashboard, ticket list UI, recommended-jobs UI, or any
  product-shaped web surface for seekers.** See §3.4.

### 6.2.1 Explicitly out of scope — *forever*, not just v0

- **Mode 2 BYO seeker agent** (external agent acting as the seeker's
  negotiation advocate, replacing the Spyglass seeker-agent). Someone else
  can build that on top of our A2A surface; we will not. See §3.3.
- **A SaaS-shaped seeker product surface.** Spyglass is a conversational
  product, not a dashboard product. See §3.4.

### 6.3 v0 labor segment

White-collar, full-time roles. Engineering, product, design, marketing, ops,
sales. Specifically excluding contract / 1099 / staffing-firm flow, hourly /
shift work, and licensed-professional roles (medical, legal, finance with
FINRA) at v0.

### 6.4 Geographic phasing — the launch model

Geographic phasing is **the** launch model. We pick which jurisdictions
Spyglass operates in for each phase, and we do not sell into the others.
Employer attests hiring jurisdiction at req creation; seeker attests work
jurisdiction at signup. Mismatches are gated by the per-jurisdiction policy
gates (§4.8 primitive 2). See `docs/COMPLIANCE_ARCHITECTURE.md` for full
detail; specifics below are placeholders pending counsel review.

| Phase | Scope                                  | Gating requirements                                                                 |
|-------|----------------------------------------|-------------------------------------------------------------------------------------|
| 0     | Private alpha, single jurisdiction     | Friends & design partners only. Explicit consent. **No production hiring decisions.** |
| 1     | **v0 — 3–5 US states, no AEDT-specific law** | Federal EEOC standards met. Geographic limits explicit at signup.             |
| 2     | + NYC                                  | Independent bias audit completed and published. 10-business-day pre-use notice mechanic live. |
| 3     | + Colorado, California, Illinois        | Per-statute requirements. CA and EU likely largest lifts.                          |
| 4     | + EU                                   | EU AI Act compliance is a substantial program of its own.                          |

We do **not** attempt to satisfy NYC + IL + CO + CA simultaneously at v0.
That's wasted motion if early customers don't need those jurisdictions.

### 6.5 Out of scope for Phase 0 specifically

Phase 0 (private alpha) shares code with v0 but has additional posture:
- **No production hiring decisions** — recommendations only, every dossier
  carries an "alpha — informational only" banner
- **Explicit per-seeker and per-employer consent** to AI-mediated process
- **All escalations require human review before any outreach**
- **No marketing or public availability**

---

## 7. Tech Stack (committed at this PRD's level)

| Concern                  | Choice                                          |
|--------------------------|-------------------------------------------------|
| Hosting                  | Vercel                                          |
| Application framework    | Next.js App Router (one app, route groups)      |
| Database                 | Neon Postgres (Vercel Marketplace)              |
| ORM                      | Drizzle                                         |
| Auth                     | Clerk (orgs for employer side)                  |
| Durable workflow         | Inngest                                         |
| LLM access               | Vercel AI Gateway + AI SDK v6                   |
| Object storage           | Vercel Blob (private; signed dossiers)          |
| Telegram                 | grammY or telegraf (TBD in plan phase)          |
| Email (transactional)    | TBD (Resend likely)                             |
| API contracts            | OpenAPI (hand-authored), generated TS types     |
| External agent interop   | Google A2A (server only; agent cards exposed)   |
| Repo layout              | pnpm workspaces + Turborepo monorepo            |
| Spec workflow            | spec-kit (constitution → roadmap → per-feature) |

Module structure:

```
spyglass/
├── apps/
│   ├── web/                  Next.js: admin, seeker web chat, API, A2A, Inngest
│   ├── telegram-bot/         Telegram webhook handler
│   └── whatsapp-bot/         (v1)
├── packages/
│   ├── parley/               Harness (runner, privacy-filter, rubric-registry,
│   │                         audit-log, dossier)
│   ├── tickets/              Ticket store, state machines, transition guards
│   ├── agents/               Seeker + employer agent LLM logic
│   ├── db/                   Drizzle schema, migrations
│   ├── api-contracts/        OpenAPI YAML, generated types
│   ├── a2a/                  A2A server (agent cards, JSON-RPC handlers)
│   ├── channels-core/        Shared adapter interface
│   ├── auth/                 Clerk wrappers + role/permission layer
│   ├── ai/                   AI Gateway client, prompt registry, embeddings
│   └── shared/               Types, errors, utilities
└── .specify/                 spec-kit artifacts
```

---

## 8. Success Metrics

### 8.1 Leading indicators (first 6 months)

| Metric                                       | Why it matters                          |
|----------------------------------------------|-----------------------------------------|
| Seeker sign-ups                              | Network is the moat                     |
| Seeker D7 / D30 retention (active tickets)   | Engagement quality                      |
| Employer sign-ups (paying)                   | Demand-side validation                  |
| Reqs posted per active employer per month    | Stickiness                              |
| Match tickets opened per active req          | Coverage                                |
| Match tickets where both thresholds clear    | Quality of matching                     |
| Dossiers delivered → interview scheduled     | Pre-qualification quality               |
| Average time req-open → first interview-ready candidate | Core SLA promise           |

### 8.2 Lagging indicators

- Hires confirmed per req
- Time-to-hire (open → close-as-filled)
- Per-hire revenue (employer-side)
- Seeker NPS / "agent is on my side" sentiment
- Compliance audit results (zero findings = success)

---

## 9. Risks

| Risk                                                                    | Severity | Mitigation                                                                                       |
|-------------------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------------|
| Bias in employer-side rubrics → LL144 / EEOC / state-AEDT violation     | Critical | Rubric registry with bias-test artifacts per version; audit log; counsel review pre-launch (incl. private alpha); jurisdiction-phased rollout per `docs/COMPLIANCE_ARCHITECTURE.md` |
| New jurisdictional law passes mid-operation                              | High     | Geographic kill switches flippable without deploy; jurisdiction-phasing posture means we have a defensible "we're not in your jurisdiction yet" answer |
| Demographic data handling for bias audits leaks or misuses               | Critical | Opt-in only; segregated storage; access controls; counsel-reviewed consent UX; reference Holistic AI / BABL AI / Eticas for audit-vendor patterns |
| Seeker network cold-start (no employers without seekers, vice versa)    | High     | Seeker-first acquisition; manually source initial employers; concierge mode in early days        |
| Agent quality below threshold for credibility                            | High     | Aggressive eval harness; human-in-loop review of early dossiers; published rubrics               |
| Employer hesitance to let agent represent them in real conversations    | High     | Default-hosted agent with full audit trail; show every conversation pre-escalation               |
| ATS integration burden if customers demand it before v1                 | Medium   | Webhooks at v0; custom integrations as paid services; ATS connectors v1                          |
| Score calibration drift across users → unfair noise                     | Medium   | Personal-tuning model + population annotations; no false absolute calibration claim              |
| Starvation UX (silence when no matches clear)                           | Medium   | Agent maintains conversational contact regardless of match flow; weekly "what we looked at" digest |
| Privacy filter leaks negotiating posture                                | High     | Privacy filter as first-class module with its own test suite; redaction is testable and audited |
| Re-negotiation loop becomes infinite or expensive                       | Low      | Hard cap at 3 rounds; per-match cost ceiling                                                     |

---

## 10. Open Questions (for spec phase)

1. **Pre-qualification depth.** How deep does the seeker-agent's pre-match
   conversation go? Resume Q&A only? Salary expectations? Mock interview?
   Drives whether we are sourcing or career-coach product.
2. **Pricing model.** Per-hire, per-req-month, freemium-for-seekers, or some
   blend? Drives instrumentation and gating decisions.
3. **Seeker ticket auto-snooze.** Do we have an `Active → Snoozed` (auto, after
   N days no engagement) intermediate state, or just `Active ⇄ Paused` with
   the agent owning engagement?
4. **Asymmetric outcome feedback default.** The deck specifies "surface to
   cleared side; match stays warm." What does the *non-cleared* side
   experience? Default silent + opt-in per-event feedback (current proposal),
   or always-aggregate-feedback, or something else?
5. **Rubric override bounds for employers.** What can employers tune (factor
   weights within bounds) vs. what is locked (factor list itself, bias-tested
   weights minimums/maximums)?
6. **A2A v0 surface.** We expose A2A endpoints in v0 even though we don't
   depend on them for customer flow. Which agent cards do we publish?
   `seeker-intake`, `employer-intake`, `match-coordinator`,
   `negotiation-participant`, `dossier-reader` — confirm the v0 set.
7. **Email channel implementation.** Inbound parsing strategy (Resend / Postmark
   / SES inbound)? Threading model?
8. **Audit log retention.** How long do we keep full audit trail per
   regulatory requirements? 7 years for EEOC at minimum.
9. **Phase 1 jurisdiction set.** Which 3–5 US states do we open with? Drives
   counsel scope, marketing geo-targeting, and signup-flow attestations.
   Decision needed before private alpha.
10. **Demographic data consent UX.** When and how seekers opt in to providing
    protected-class data for bias-audit purposes. Storage, access, and
    segregation from operational data. Counsel-reviewed before any collection.
11. **Joint controllership posture.** When Spyglass's agent makes
    hiring-relevant decisions on behalf of an employer, who is the controller
    for GDPR (and equivalent) purposes? Likely both, with split
    responsibilities — needs DPA templates.
12. **Audit cadence.** NYC requires annual; EU AI Act expects ongoing
    monitoring. Minimum cadence covering all active jurisdictions?
13. **Candidate appeal / human-review rights.** EU AI Act in particular
    requires human-in-the-loop for high-impact decisions. The match ticket
    has a human review step on threshold-clear; counsel needs to confirm
    sufficiency.
14. **Cross-border data flows.** EU seeker + US employer scenario: what data
    crosses, under what mechanism (SCCs, adequacy)?

---

## 11. Next Steps

1. **Initialize spec-kit** — `/init-speckit` to set up `.specify/`.
2. **Constitution** — `/speckit-constitution` capturing principles already
   locked in this PRD: agents-as-advocates, two-sided independent scoring,
   privacy filter as first-class, defensibility from day one, ticket model as
   data spine, Parley as engine, channels as transports.
3. **Read SPEC.md** (Parley spec) — at minimum the agent-contract,
   privacy-filter, run-state-machine, audit-log, and rubric-versioning
   sections, before drafting the Parley package's internal shape.
4. **Roadmap** — `/speckit-roadmap` against this PRD to extract feature list
   and priority order.
5. **First spec** — likely the ticket store + state machines, since
   everything else depends on it.

---

## Appendix A — Source Material

This PRD synthesizes:

- The conversation with Austin on seeker/employer asymmetry and the
  sourcing-not-screening positioning.
- The ticket-centric reframe ("tickets at the center, A2A on the edges").
- The two-sided agent negotiation framing (independent scoring, thresholds,
  privacy filter as negotiation posture).
- `JobBobber_Ticket_Lifecycle.pptx` — the ticket-lifecycle deck (six slides).
- `docs/COMPLIANCE_ARCHITECTURE.md` — the compliance posture, harness
  primitives, and phased rollout model. Authored under the JobBobber name.
- The Parley specification at `/mnt/f/parley/SPEC.md` (referenced; not yet
  fully read into this PRD).

## Appendix B — Glossary

- **Spyglass** — this product. Previously called JobBobber.
- **Parley** — the agent-negotiation harness specification this product is
  built on. Spec-only repo at `/mnt/f/parley`.
- **Ticket** — the unit of work. Three types: seeker, employer (req), match.
- **Match ticket** — the container for a single agent-to-agent negotiation
  between one seeker ticket and one employer ticket.
- **Rubric** — the versioned, bias-tested scoring framework used by an agent
  to evaluate fit from its principal's perspective.
- **Threshold** — the human-set score cutoff on a ticket above which the agent
  is authorized to escalate.
- **Privacy filter** — the module that enforces what each agent may and may
  not disclose during negotiation.
- **Dossier** — the signed proof-of-work artifact produced by Parley at the
  end of a match-ticket negotiation. Delivered to humans via channel /
  console / webhook.
- **A2A** — Google Agent2Agent protocol. External interop only.
