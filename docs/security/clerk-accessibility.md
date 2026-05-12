# Clerk-Hosted UI Accessibility Posture

**Owner:** F02 (Identity & Auth)
**Spec ref:** spec.md NFR-14, plan Decision 9
**Constitution:** v2.0.0 §III.1 (WCAG 2.2 Level AA)
**Last reviewed:** 2026-05-08
**Next review trigger:** any major bump of `@clerk/nextjs`

---

## Why this document exists

Per Constitution §III.1 and spec NFR-14, every Spyglass-rendered
authentication-adjacent UI meets WCAG 2.2 Level AA at minimum. F02
deliberately renders **no** custom signup/login/MFA/profile views
(PRD §3.4) — those surfaces are entirely Clerk-hosted.

Inheriting a vendor's accessibility posture is acceptable, but
auditors and operators need a paper trail of:

1. Which Clerk SDK version was reviewed.
2. What Clerk's documented accessibility commitment is.
3. When the next review is due.

This file is that trail.

---

## Pinned Clerk SDK version

The dependency is **pinned** (no caret) so an unsupervised SDK bump
cannot land an accessibility regression silently:

- Package: `@clerk/nextjs`
- Pinned version: **`7.3.2`** (Clerk Core 3, March 2026 release line)
- Dependency declaration: `apps/web/package.json` `dependencies`

Bumping this dependency is a **deliberate** action that updates
this file and re-runs the verification checklist below.

## Clerk's accessibility commitment

Reviewer must verify each of the following at review time. Links
below should be checked, not assumed.

- [ ] Clerk publishes an accessibility statement / VPAT
      ([https://clerk.com/legal/accessibility](https://clerk.com/legal/accessibility)
      or the equivalent URL in effect at review time).
- [ ] The statement claims WCAG 2.2 AA (or stronger) conformance for
      the hosted Sign-In, Sign-Up, User Profile, and Organization
      Switcher components used by Spyglass.
- [ ] Clerk's component theming options (appearance prop,
      `<ClerkProvider>` config) preserve color-contrast ratios
      consistent with WCAG 2.2 SC 1.4.3 / 1.4.11.

If any of these is no longer true at review time, escalate to
`/security-review` and consider whether to roll back the SDK or
ship Spyglass-side overrides.

## Spyglass-side rendering

The only auth-adjacent UI Spyglass renders directly is:

- MFA-step banners (B3 T061) — must meet WCAG 2.2 AA on its own.
- Sign-out confirmation (B6 T060) — same.
- Operator console pages (B6 T056–T059) — same; covered by T062.

Each of those tasks runs the manual a11y checklist below before
its sub-phase gate.

## Manual a11y checklist (Spyglass-side components)

- [ ] Tab order matches reading order; visible focus indicator on
      every focusable element (SC 2.4.7 / 2.4.11).
- [ ] All interactive controls are keyboard-operable (SC 2.1.1).
- [ ] Form fields have programmatic labels (SC 1.3.1, 3.3.2).
- [ ] Error messages are programmatically associated with their
      field (SC 3.3.1) and do not rely on color alone (SC 1.4.1).
- [ ] Color-contrast ratio ≥ 4.5:1 for text (SC 1.4.3) and ≥ 3:1
      for non-text (SC 1.4.11).
- [ ] Dynamic content updates (e.g., "MFA required" banner) are
      announced via `aria-live` (SC 4.1.3).
- [ ] No keyboard traps (SC 2.1.2).
- [ ] Authenticated-state changes do not move focus unexpectedly
      (SC 3.2.1).

## Review log

| Date       | SDK version | Reviewer | Outcome | Notes |
|------------|-------------|----------|---------|-------|
| 2026-05-08 | 7.3.2       | Gary (F02 owner) | Initial pin | Clerk Core 3; statement to verify on B6 a11y review (T062) |

(Append a row on every SDK bump or scheduled re-review.)
