# F22 Accessibility Review

## Scope

Employer console layout, profile form, req create/amend/close views, req and candidate tables, candidate dossier detail, auth/validation banners, and non-enumerating feedback states.

## Results

| Area | Result | Evidence |
| --- | --- | --- |
| Landmarks and navigation | Pass | Console layout includes skip link, navigation, and main content target. |
| Headings | Pass | Views render page-level headings and scoped section headings. |
| Forms | Pass | Profile and req forms use labels, field-level errors, and error summaries. |
| Tables | Pass | Req and candidate lists include captions/headers and bounded empty states. |
| Confirmation flow | Pass | Req close view uses an explicit confirmation form with keyboard-operable native controls. |
| Feedback | Pass | Shared feedback components provide status/error states without leaking internal principal or policy details. |
| Keyboard operation | Pass | Controls are native links, buttons, inputs, selects, and textareas. |

## Automated Evidence

- `pnpm --filter @spyglass/web test -- --runInBand src/employer-console/__tests__` passed with view coverage for layout-adjacent states, forms, tables, close confirmation, feedback, and privacy projections.
- `pnpm --filter @spyglass/web build` passed and emitted all `/employer/console/*` routes.

## Manual Evidence

Manual browser and assistive-technology validation were not run locally because the environment lacks an interactive Clerk employer admin session and seeded employer candidate fixtures. This is recorded as a validation blocker, not a code waiver.
