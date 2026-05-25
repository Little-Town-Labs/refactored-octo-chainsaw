# Security and Accessibility Review: Seeker Web Surface

## Scope

Reviewed the F21 public seeker web surface for authentication boundaries,
privacy leakage, unsupported product-surface claims, A2A over-promise, and basic
semantic accessibility.

## Findings

- No blocking findings.

## Security Notes

- Public routes expose only landing content, public discovery docs, and
  discovery-only A2A card metadata.
- A2A cards explicitly state `future-interop` and `handler-deferred`; no card
  advertises a live runtime protocol handler.
- Unsupported actions include dashboard, ticket list, analytics, recommended
  jobs, job browsing, raw transcript, hidden run state, and direct counterparty
  messaging.
- The proxy can classify public routes without Clerk config for local validation,
  but Clerk middleware remains the configured path when
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is present.

## Accessibility Notes

- Landing page uses semantic `<main>`, sections, labelled headings, and a labelled
  navigation region for account actions.
- Links use visible text and stable hrefs for signup, signin, profile, public
  docs, and A2A discovery.
- Jest render smoke tests cover headings, landmarks, focusable links, and
  responsive/no-dashboard assertions.

## Residual Risk

- Browser screenshot validation was attempted but not completed because Python
  Playwright is not installed in this workspace. Production HTTP validation and
  Jest render coverage passed; a follow-up browser screenshot pass can be run
  once Playwright is available.
