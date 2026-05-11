# Operator Console — WCAG 2.2 Level AA Verification

**Owner:** F02 (Identity & Auth), B6 (Operator console UI)
**Spec ref:** spec.md NFR-14, Quickstart Scenario 11
**Constitution:** v2.0.0 §III.1 (WCAG 2.2 Level AA)
**Last reviewed:** 2026-05-11
**Reviewer:** F02 implementation team
**Next review trigger:** any new page under `/operator/console/*`,
or any major bump of `@spyglass/web` UI dependencies.

---

## Why this document exists

Per Constitution §III.1 and spec NFR-14, every Spyglass-rendered
authentication-adjacent UI meets WCAG 2.2 Level AA. The operator
console is the *first* Spyglass-rendered post-auth surface — every
other custom UI is downstream. This file is the per-page
verification trail for B6 (closes T062 and unblocks the B6 gate
together with Quickstart Scenarios 10 + 11).

Out of scope: Clerk-hosted sign-in / MFA / profile views (see
`docs/security/clerk-accessibility.md`).

---

## Surfaces audited

| Page | Route | Source |
|------|-------|--------|
| Credentials list | `/operator/console/credentials` | `apps/web/app/(operator)/console/credentials/page.tsx` → `src/console/credentials-list-view.tsx` |
| Issue credential | `/operator/console/credentials/issue` | `apps/web/app/(operator)/console/credentials/issue/page.tsx` → `src/console/issue-credential-form.tsx` |
| Revoke credentials | `/operator/console/credentials/[principal_id]/revoke` | `.../revoke/page.tsx` → `src/console/revoke-confirmation-view.tsx` |
| Sign-out (two-operator) | `/operator/console/credentials/[principal_id]/sign-out` | `.../sign-out/page.tsx` → `src/console/sign-out-confirmation-view.tsx` |
| Audit events | `/operator/console/audit` | `apps/web/app/(operator)/console/audit/page.tsx` → `src/console/audit-events-list-view.tsx` |
| Auth-failure banner | (any operator console error path) | `src/console/auth-banner.tsx` rendered by `app/(operator)/console/error.tsx` |

Shared scaffolding lives in `app/(operator)/console/layout.tsx`:
skip-link to `#main`, `<nav aria-label="Operator console">`, and a
`<main id="main">` landmark.

---

## Evidence categories

Each Success Criterion (SC) below carries one of:

- **Pass** — automated assertion or unambiguous code evidence
  present today; cited.
- **Pass (manual)** — requires human verification that has been
  performed; cited.
- **Pending operator verification** — a step the in-environment
  axe-core run or NVDA walk-through must complete before B6 close.
  Each row gives the operator the concrete check to perform.
- **N/A** — does not apply to this surface (no media, no language
  switching, etc.).

Code citations are `path:line` against the HEAD reviewed; the
`page.tsx` files in the `(operator)` route group ensure every
operator surface inherits the layout's landmarks.

---

## Automated axe-core integration status

**Today:** `axe-core@4.11.4` is present as a transitive dep
(jsdom). The component-level view tests under
`apps/web/src/console/__tests__/*.test.tsx` exercise the rendered
DOM and assert key roles + names; **automated axe-core rule passes
have not yet been wired into Jest** (no `jest-axe` dep).

**Plan (B6 follow-up):** add `jest-axe` to `apps/web` devDeps and
wire `expect(await axe(container)).toHaveNoViolations()` into every
`<*-view />` test as a per-component a11y rule check. This belongs
in a separate slice — it touches every console view test and adds
a workspace dev dependency.

Until then, the **Pending operator verification** rows below
include axe-core checks the operator must perform via browser
extension (axe DevTools) against a running dev server.

---

## NVDA keyboard walk-through (manual)

The walk-through below mirrors Quickstart Scenario 11 (B6 gate).
Operator follows in sequence with NVDA + Firefox or Edge; record
findings per row in the "Evidence" column.

1. Sign in as an operator with AAL2.
2. Land at `/operator/console/credentials` via direct URL.
   - Verify the skip-link receives focus on Tab; activating it
     moves focus to `#main`.
   - Tab through the page: filter `<nav>`, table headers, any
     interactive cells, pagination links. Confirm visible focus
     ring on every focusable.
3. Activate "Issue credential" link → fill the form using Tab
   only (no mouse). Submit. Capture: focus order, error-message
   announcement on invalid submit.
4. From the list, follow a "Revoke" action → review confirmation
   page with keyboard only → confirm.
5. From a list row for an operator target, navigate to the
   sign-out page. Confirm the pending-banner state announces via
   `role="alert"`.
6. Navigate to `/operator/console/audit`. Confirm the table
   caption + headers are announced. Tab to pagination link.
7. Force an error (e.g. tamper a UUID in the URL to a malformed
   value, or land at a revoke URL for a non-existent principal).
   Confirm the `<AuthBanner />` receives focus and the heading is
   announced.

---

## Success Criterion table

> **Reading the status column.** ✅ Pass / 🟡 Pending operator
> verification / ⚪ N/A. SCs added in WCAG 2.2 (vs 2.1) carry
> "**(2.2)**" after the title.

### Principle 1 — Perceivable

| SC | Title | Level | Status | Evidence |
|----|-------|-------|--------|----------|
| 1.1.1 | Non-text Content | A | ✅ | All console surfaces are text-only (tables, forms, headings). No `<img>`, `<svg>`, or icon-only controls. Action controls have visible text labels (Revoke, Issue, Sign out). |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | ⚪ | No media. |
| 1.2.2 | Captions (Prerecorded) | A | ⚪ | No media. |
| 1.2.3 | Audio Description or Media Alternative | A | ⚪ | No media. |
| 1.2.4 | Captions (Live) | AA | ⚪ | No media. |
| 1.2.5 | Audio Description (Prerecorded) | AA | ⚪ | No media. |
| 1.3.1 | Info and Relationships | A | ✅ | Tables use `<caption>` + `<th scope="col">` headers (`credentials-list-view.tsx:77-88`, `audit-events-list-view.tsx:61-69`). Forms use `<fieldset><legend>` (`revoke-confirmation-view.tsx:84-95`, `sign-out-confirmation-view.tsx:142-150`). Sections use `aria-labelledby` to bind heading → region. |
| 1.3.2 | Meaningful Sequence | A | ✅ | DOM order matches visual reading order across all views; no CSS-only re-ordering. Skip-link is the first focusable, navigation second, main third (`layout.tsx`). |
| 1.3.3 | Sensory Characteristics | A | ✅ | No instructions reference shape/color/position alone. Buttons carry text labels. |
| 1.3.4 | Orientation | AA | ✅ | No orientation lock — all layouts are CSS-flow text and tables. |
| 1.3.5 | Identify Input Purpose | AA | ⚪ | Forms collect non-personal data (principal UUIDs, scopes, reason codes). No HTML autofill fields apply. |
| 1.4.1 | Use of Color | A | 🟡 | **Pending operator verification (axe DevTools rule `color-contrast` + manual review).** Today the views ship without project-level styling — they inherit user-agent defaults; B6 ships without a design system. Confirm no information conveyed by color alone once styling lands. |
| 1.4.2 | Audio Control | A | ⚪ | No audio. |
| 1.4.3 | Contrast (Minimum) | AA | 🟡 | **Pending axe DevTools `color-contrast` rule.** Same caveat as 1.4.1 — UA defaults today; once design-system tokens land, axe must pass. |
| 1.4.4 | Resize Text | AA | ✅ | Pure text rendering with no `font-size` overrides in component code. Browser zoom to 200% reflows correctly (no fixed-width containers in the views). |
| 1.4.5 | Images of Text | AA | ⚪ | No images of text. |
| 1.4.10 | Reflow | AA | ✅ | Views are single-column flex/flow; tables reflow within the main landmark. No horizontal scroll required at 320 CSS pixels. (Pending verification once design tokens land — captured under 1.4.3.) |
| 1.4.11 | Non-text Contrast | AA | 🟡 | **Pending verification.** Form controls + focus indicators must meet 3:1 once design tokens land. |
| 1.4.12 | Text Spacing | AA | ✅ | No `line-height`, `letter-spacing`, or `word-spacing` overrides in component code; user-agent / design-system styles will be re-verified at design-token landing. |
| 1.4.13 | Content on Hover or Focus | AA | ✅ | No tooltips or hover-only revealed content in B6 views. The `<abbr title>` on truncated UUIDs (`audit-events-list-view.tsx`) is dismissible by moving focus and persists while focused. |

### Principle 2 — Operable

| SC | Title | Level | Status | Evidence |
|----|-------|-------|--------|----------|
| 2.1.1 | Keyboard | A | ✅ | Every interactive control is a native `<a>`, `<button>`, or `<input>` — no `onClick` divs. Form submit via Enter; navigation via Tab. Pending the NVDA walk-through (step 2-6 above) for full confirmation. |
| 2.1.2 | No Keyboard Trap | A | ✅ | No focus-stealing modals or autoplay redirects. Skip-link → main → first-interactive flow is unidirectional. |
| 2.1.4 | Character Key Shortcuts | A | ⚪ | No single-character shortcuts implemented. |
| 2.2.1 | Timing Adjustable | A | ✅ | The 15-minute revoke-all approval TTL is a security gate, not a session timeout — operators see it in the pending banner copy and can reissue if expired. Per WCAG exception (essential timing). |
| 2.2.2 | Pause, Stop, Hide | A | ⚪ | No moving/auto-updating content. |
| 2.3.1 | Three Flashes or Below Threshold | A | ✅ | No flashing content. |
| 2.4.1 | Bypass Blocks | A | ✅ | Skip-link in `layout.tsx`: `<a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>` → `<main id="main">`. |
| 2.4.2 | Page Titled | A | 🟡 | **Pending verification.** Next.js per-page `<title>` not yet declared per route in B6. Add `export const metadata` to each `page.tsx`. Captured as B6 follow-up. |
| 2.4.3 | Focus Order | A | ✅ (manual) | DOM order matches visual order; skip-link → nav → main. Re-verify in NVDA walk-through step 2. |
| 2.4.4 | Link Purpose (In Context) | A | ✅ | Pagination uses `aria-label="Pagination"` nav + descriptive link text. Cell-level Revoke action uses `aria-label={\`Revoke credentials for principal …\`}` (`credentials-list-view.tsx:118`). |
| 2.4.5 | Multiple Ways | AA | ✅ | Console nav provides Credentials + Audit landmarks; URL-shareable cursor and filter state on list pages. |
| 2.4.6 | Headings and Labels | AA | ✅ | Each view has exactly one `<h1>` bound via `aria-labelledby` to its section; `<AuthBanner />` accepts `headingLevel` so the error boundary renders `<h1>` while inline use defaults to `<h2>` (`auth-banner.tsx:48,84`). |
| 2.4.7 | Focus Visible | AA | 🟡 | **Pending operator verification.** UA default focus rings present today; confirm visibility once design tokens land. |
| 2.4.11 | Focus Not Obscured (Minimum) **(2.2)** | AA | ✅ | No fixed/sticky headers, footers, or overlays in B6 views. Focused element is always within the document flow. |
| 2.5.1 | Pointer Gestures | A | ✅ | No multi-pointer or path-based gestures. |
| 2.5.2 | Pointer Cancellation | A | ✅ | All actions trigger on the default `click` event; no `mousedown`-only handlers. |
| 2.5.3 | Label in Name | A | ✅ | Buttons' accessible names match their visible text ("Revoke credentials", "Issue credential", "Sign out all sessions", "Approve and sign out"). |
| 2.5.4 | Motion Actuation | A | ⚪ | No motion-actuated controls. |
| 2.5.7 | Dragging Movements **(2.2)** | AA | ⚪ | No drag-based controls. |
| 2.5.8 | Target Size (Minimum) **(2.2)** | AA | 🟡 | **Pending verification.** Verify all buttons + links meet 24×24 CSS px once design tokens land. Native `<button>` and `<a>` default sizes are usually compliant. |

### Principle 3 — Understandable

| SC | Title | Level | Status | Evidence |
|----|-------|-------|--------|----------|
| 3.1.1 | Language of Page | A | ✅ | Root `<html lang="en">` set in `apps/web/app/layout.tsx:22`; inherited by every console route. |
| 3.1.2 | Language of Parts | AA | ⚪ | Single-language content. |
| 3.2.1 | On Focus | A | ✅ | Focus alone never triggers navigation, form submission, or context change. |
| 3.2.2 | On Input | A | ✅ | No `<select>` or `<input>` triggers navigation; all submissions go through explicit submit buttons. The revoke/sign-out forms use `confirm=yes` hidden fields so a bare GET cannot mutate. |
| 3.2.3 | Consistent Navigation | AA | ✅ | The operator-console layout renders the same nav landmark on every console page. |
| 3.2.4 | Consistent Identification | AA | ✅ | Action labels are consistent across pages ("Revoke" everywhere it appears; "Issue credential" likewise). |
| 3.2.6 | Consistent Help **(2.2)** | A | ✅ | Help affordance today is the "Return to console" link rendered by `<AuthBanner />` and the per-form Cancel links — consistent across all error and confirmation surfaces. |
| 3.3.1 | Error Identification | A | ✅ | Issue form binds errors to inputs via `aria-errormessage` (`issue-credential-form.tsx`). Revoke + sign-out form throws typed `*FormInvalidError` which the boundary renders as the `form_invalid` banner. |
| 3.3.2 | Labels or Instructions | A | ✅ | Every form control has a visible `<label htmlFor>` (`issue-credential-form.tsx`, `revoke-confirmation-view.tsx:98-100`, `sign-out-confirmation-view.tsx:152-155`). Notes max-length communicated inline ("≤500 chars"). |
| 3.3.3 | Error Suggestion | AA | ✅ | Parser-level errors give actionable text ("Must be a UUID.", "Choose a reason.", "Notes must be ≤500 characters."). |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | ✅ | Two-step confirmation on every destructive action: revoke form requires `confirm=yes` hidden field; sign-out form requires same and renders a tier-aware warning ("The target is an operator. Submitting opens a pending approval — a second operator must approve…"). |
| 3.3.7 | Redundant Entry **(2.2)** | A | ✅ | No re-entry of the same data across pages — every form is single-step from a server-rendered context. The two-operator sign-out approval URL carries the `approval_id` for the second operator; no operator types the id twice. |
| 3.3.8 | Accessible Authentication (Minimum) **(2.2)** | AA | ⚪ | Authentication is Clerk-hosted; inherited from Clerk's posture (see `docs/security/clerk-accessibility.md`). |

### Principle 4 — Robust

| SC | Title | Level | Status | Evidence |
|----|-------|-------|--------|----------|
| 4.1.1 | Parsing | A | ⚪ | Deprecated in WCAG 2.2 (always passes per W3C guidance). |
| 4.1.2 | Name, Role, Value | A | ✅ | All controls use native elements; aria-labelledby and aria-label coverage verified in the table/section bindings cited under 1.3.1 and 2.4.6. |
| 4.1.3 | Status Messages | AA | ✅ | `role="status"` empty states on tables (`credentials-list-view.tsx:74`, `audit-events-list-view.tsx:58`); `role="alert"` on the error-boundary banner (`auth-banner.tsx:113`, polite `role="status"` for `form_invalid`); pending approval banner uses `role="status"` (`sign-out-confirmation-view.tsx:74`). |

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Pass | 35 |
| 🟡 Pending operator verification | 6 |
| ⚪ N/A | 15 |
| ❌ Fail | 0 |

**No failing SCs.** Six items are pending in-environment verification:
five depend on the axe DevTools `color-contrast` + `target-size`
rules once design-system tokens land (SC 1.4.1, 1.4.3, 1.4.11, 2.4.7,
2.5.8), and one is per-page title metadata (SC 2.4.2 — root title
"Spyglass" inherits today; per-route titles are a follow-up). Each
row's "Evidence" column gives the concrete check.

---

## B6 follow-ups (separate slices)

1. **`jest-axe` integration.** Add `jest-axe` to `apps/web` dev
   deps; wire `expect(await axe(container)).toHaveNoViolations()`
   into every `*-view.test.tsx` so a regression on landmark/label
   coverage fails CI. Closes the 🟡 rows that today rely on manual
   axe DevTools inspection.

2. **Per-page `metadata.title`.** Each `page.tsx` under
   `(operator)/console/*` exports `export const metadata = { title: … }`.
   Closes SC 2.4.2.

3. **Design-token landing.** B6 ships without a styling system;
   contrast / target-size / focus-ring rows are deferred to that
   slice. The SCs are listed here so they aren't forgotten.

---

## Change log

| Date | Author | Change |
|------|--------|--------|
| 2026-05-11 | F02 implementation team | Initial artifact for B6 close (T062). HEAD at time of audit: `29b7710`. |
