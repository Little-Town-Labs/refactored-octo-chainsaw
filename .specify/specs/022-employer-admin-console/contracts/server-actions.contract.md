# Server Actions Contract: Employer Admin Console

## Common Result Shape

All F22 form actions return a non-enumerating result:

```ts
type EmployerConsoleActionResult =
  | { status: "success"; id?: string; identifier?: string; state?: string }
  | { status: "error"; serverError?: string; errors: Record<string, string[]> };
```

## Actions

### Save Employer Profile

**Caller**: `employer_admin`, active organization, AAL2.

**Input fields**:

- `company_name`
- `company_summary`
- `mission`
- `culture`
- `benefits`
- `workplace_policy`

**Behavior**:

- Upserts profile for the active organization.
- Audits mutation.
- Returns field errors for invalid or missing required fields.

### Submit Employer Requisition

**Caller**: `employer_admin`, active organization, AAL2.

**Input fields**:

- `role_title`
- `role_level`
- `comp_band_min`
- `comp_band_max`
- `currency`
- `jurisdictions`
- `decision_locus_jurisdiction`
- `work_mode`
- `headcount_total`
- `threshold`
- `flags`

**Behavior**:

- Creates an employer req ticket under the active organization.
- Transitions through the existing employer req lifecycle.
- Returns the req ticket id, identifier, and state.

### Amend Employer Requisition

**Caller**: `employer_admin`, active organization owner, AAL2.

**Input fields**:

- `employer_req_ticket_id`
- Any allowed source fields from req creation.

**Behavior**:

- Updates allowed source fields only.
- Preserves jurisdiction-cascade/audit behavior.
- Fails closed for wrong organization or terminal req state.

### Close Employer Requisition

**Caller**: `employer_admin`, active organization owner, AAL2.

**Input fields**:

- `employer_req_ticket_id`
- `terminal_state`: `filled` or `closed`
- `reason_code`
- `notes`

**Behavior**:

- Applies a valid terminal transition.
- Treats user-facing cancellation as internal `closed` with a cancellation reason.
- Audits actor, reason, and resulting state.
- Prevents further active candidate presentation for that req.

## Explicitly Deferred

F22 does not expose candidate disposition mutation. Candidate inbox and dossier detail surfaces are read-only review views; disposition capture requires a future contract.

## Principal Coverage

Every action must call `getPrincipal()` or a `withPrincipal(...)` wrapper and must pass `scripts/check-principal-coverage.sh`.
