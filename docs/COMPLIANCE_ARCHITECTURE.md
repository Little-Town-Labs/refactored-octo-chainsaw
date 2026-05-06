# Compliance architecture note

> **Note on naming.** This document was authored when the product was called
> *JobBobber*. It is preserved here verbatim as part of Project Spyglass's
> source material. References to "JobBobber" should be read as "Spyglass."
> See `PRD.md` for the rename context.

Companion document to the harness spec. Captures the compliance posture JobBobber needs to support, the harness primitives that carry compliance obligations, and the phased rollout approach.

This note is **light-touch by design**. It records the shape of the problem and the architectural decisions that follow from it. Detailed legal review, jurisdiction-by-jurisdiction requirements, and operational procedures live elsewhere.

## Status

Working notes. Not legal guidance. Requires review by employment-law counsel with AI hiring experience before any launch — including private alpha.

## The compliance landscape (as we currently understand it)

US AI hiring law is jurisdictional. There is no single federal AEDT (automated employment decision tool) statute. Federal coverage runs through EEOC enforcement of Title VII / ADA / ADEA on discriminatory outcomes, plus the EEOC's 2023 guidance on AI tools. Specific procedural obligations come from state and city law.

Non-exhaustive map of obligations we expect to encounter:

- **NYC Local Law 144** — annual independent bias audit, public summary, candidate notification at least 10 business days before AEDT use. In force since 2023.
- **Illinois AIVIA** — narrow, covers AI analysis of video interviews. Plus HB 3773 (effective Jan 2026) making discriminatory-effect AI a civil rights violation.
- **Colorado SB 205 (Colorado AI Act)** — effective Feb 2026. Covers high-risk AI including hiring tools. Impact assessments and consumer disclosures required.
- **California** — FEHA regulations on automated decision systems, plus pending legislative efforts. Treat as a high-bar jurisdiction.
- **Maryland HB 1202** — restricts facial recognition in hiring.
- **EU AI Act** — fully applies to European employers as of August 2026. Hiring AI classified as high-risk with substantial obligations: risk management, data governance, transparency, human oversight, accuracy/robustness/cybersecurity.

The map keeps changing. Treat it as a moving target, not a fixed checklist.

## Phased rollout as the launch posture

Geographic phasing is the launch model — explicitly choose which jurisdictions JobBobber operates in for each phase, and don't sell into the others. Cleaner than feature-phasing-within-a-market, and gives a defensible answer to enterprise procurement: "we operate in these jurisdictions; we'll add yours when [requirements] are met."

### Strawman phase plan

Adjust based on actual customer pipeline. Shape is right, specifics are placeholders.

- **Phase 0 (private alpha)** — single jurisdiction, friends-and-design-partners only, explicit consent, no production hiring decisions. Goal: system shakedown, not compliance certification.
- **Phase 1 (Beta, geographically limited)** — 3–5 US states with no AEDT-specific law. Federal EEOC standards met. Geographic limits explicit at signup; employer attests hiring jurisdiction, seeker attests work jurisdiction.
- **Phase 2** — add NYC. Requires: independent bias audit completed and published, candidate notification flow live, 10-business-day pre-use notice mechanic in place.
- **Phase 3** — add Colorado, California, Illinois on independent timelines based on per-statute requirements. California and EU likely largest lifts.
- **Phase 4 (international)** — EU AI Act compliance is a substantial program of its own.

Don't try to launch into NYC, Illinois, Colorado, or California in phase 1 unless the work is actually done. Trying to satisfy all four at once before launch is a meaningful chunk of effort with no payoff if early customers don't need those jurisdictions.

## Compliance as harness policy, not bolt-on features

The harness spec should support compliance obligations as configurable policy from day one. Not as a separate compliance system layered on top — as primitives the harness already understands. This is the design principle that keeps the architecture honest.

### Required harness primitives

These are capabilities the harness needs in order to *carry* compliance, even if the specific policies they enforce arrive later:

- **Jurisdiction tagging on every match ticket.** Capture seeker's work jurisdiction, employer's hiring jurisdiction, and the locus where the hiring decision will be made. These can differ (remote roles raise questions). Better captured up front than retrofitted.
- **Per-jurisdiction policy gates.** Before a match ticket transitions out of negotiating, before a dossier is delivered: the harness checks whether the jurisdiction is in the active set and whether jurisdiction-specific obligations are satisfied. Failure mode: structured failure dossier, not silent skip.
- **Bias-audit-ready dossier shape.** The dossier already records rubric version, prompt version, per-dimension scores. For bias auditing, it must be joinable to demographic data when seekers consent to provide it. Sensitive — handle with care — but the *capability* is in the harness from the start.
- **Candidate notification artifacts.** NYC's 10-day notice, Illinois's notification rules, EU AI Act transparency. Notifications produce a structured artifact tied to the match ticket: timestamp, recipient, version of notice text. Same proof-of-work pattern, applied to compliance events.
- **Geographic kill switches.** Per-jurisdiction toggles flippable without a deploy. New law passes, 60-day clock starts, kill switch goes off until compliance is in place.

These are first-class harness concepts, not appendices. They belong in the spec alongside the dossier and the rubric.

## UX surfaces that double as compliance coverage

Some product features Austin already wants serve compliance obligations as a side effect. Worth noting because it reframes "compliance work" as "shipping the product correctly":

- **Aggregate insight reports to seekers** ("24 evaluations this week — 16 manufacturing, 4 insurance, 4 banks") partially satisfy NYC Local Law 144's candidate disclosure obligations. The seeker is being told the system makes evaluative decisions about them.
- **Threshold check-in proposals** ("no 7s yet, want to see 6s?") give seekers visible agency in the process — useful for human-oversight obligations under EU AI Act and similar.
- **Encouraging suggestions with data** ("you're showing promise in healthcare based on 30 evaluations") give seekers transparent feedback about how the system is treating them — closer to what regulators are looking for than minimal-disclosure approaches.

Lean into these. Compliance posture and user experience are aligned, not in tension.

## What lives outside this note

- Specific legal review and counsel engagement
- Vendor selection for bias auditing (firms doing NYC Local Law 144 audits include Holistic AI, BABL AI, Eticas, others)
- Operational procedures for running audits, publishing summaries, handling candidate inquiries
- Per-jurisdiction notification text drafting
- Demographic data collection consent flows
- Privacy and security review (separate concern, intersects but distinct)
- Internal compliance documentation for enterprise procurement responses

These are real workstreams that need to happen. They just don't live in the harness spec.

## Open questions to revisit

- **Demographic data handling.** When and how seekers can opt in to providing protected-class data for bias-audit purposes. What the consent UX looks like. How the data is stored, accessed, and segregated from operational data.
- **Joint controllership questions.** When JobBobber's agent makes hiring-relevant decisions on behalf of an employer, who is the controller for GDPR / equivalent purposes? Probably both, with split responsibilities — needs DPA templates.
- **Audit cadence and scope.** NYC requires annual audits. EU AI Act expects ongoing monitoring. What's the minimum cadence that covers all active jurisdictions?
- **Candidate appeal / human-review rights.** Several frameworks (EU AI Act especially) require humans-in-the-loop for high-impact AI decisions. The match ticket already has a human review step on threshold-clear; whether that's *sufficient* for compliance purposes needs review.
- **Cross-border data flows.** If a seeker is in the EU and an employer is in the US, what data crosses where, and under what mechanism (SCCs, adequacy decisions, etc.)?

## Reference points

- EEOC 2023 guidance on AI selection procedures — federal, applies everywhere, articulates the disparate-impact framework all jurisdictions measure against.
- NYC Local Law 144 — text and rules. The most fully-operational AEDT regime in the US.
- Colorado AI Act (SB 205) — broader, newer, watch for implementation guidance.
- EU AI Act — high-risk AI provisions for hiring tools.

## Process

This note is the lightest-weight version of the compliance architecture. When phase 1 launch becomes a real near-term plan, expand this into a full compliance program document, get counsel review, run the gap analysis against each target jurisdiction, and start the audit-vendor procurement. Don't expand it before that — speculative compliance work ahead of an actual launch decision is wasted motion.

---

*Written as working notes. Updated when launch posture or jurisdiction set changes. Not a substitute for legal advice.*
