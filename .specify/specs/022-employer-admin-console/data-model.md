# Data Model: Employer Admin Console

## Employer Console Session

- **Purpose**: Request-scoped view of the authenticated employer user.
- **Fields**:
  - `principal_id`: Internal principal identifier.
  - `tier`: `employer_admin` or `employer_member`.
  - `org_id`: Active internal employer organization.
  - `aal`: Must satisfy AAL2 for admin surfaces.
- **Rules**:
  - Missing organization fails closed.
  - Admin-only mutations require `employer_admin`.
  - Members are read-oriented unless explicitly granted later.

## Employer Organization Profile

- **Purpose**: Company context shown in the console and consumed by the employer advocate.
- **Fields**:
  - `org_id`: Owning organization.
  - `profile_id`: Durable profile row identifier when implemented as `employer_organization_profiles`.
  - `company_name`: Display name.
  - `company_summary`: Public employer context suitable for candidates.
  - `mission`, `culture`, `benefits`, `workplace_policy`: Matching-relevant profile text.
  - `updated_at`: Last profile update time.
- **Rules**:
  - Organization-scoped; never readable across employers.
  - No billing, ATS admin, or secret integration fields in F22.
  - Mutations are audited.
  - F22 requires a dedicated `employer_organization_profiles` store unless implementation proves an existing durable profile table already provides all fields without mutating Clerk-mirror `organizations` rows.

## Employer Requisition

- **Purpose**: Organization-owned req ticket that drives employer-side matching.
- **Fields**:
  - `employer_req_ticket_id`, `identifier`
  - `org_id`
  - `role_title`, `role_level`
  - `comp_band_min`, `comp_band_max`, `currency`
  - `jurisdictions`, `decision_locus_jurisdiction`
  - `work_mode`
  - `headcount_total`, `headcount_filled`
  - `threshold`
  - `flags`
  - `state`
- **Lifecycle**:
  - Draft/submitted/open/matching/filled/closed/withdrawn according to the existing employer req state machine. User-facing canceled reqs map to internal `closed` with a cancellation reason.
- **Rules**:
  - Compensation minimum cannot exceed maximum.
  - At least one hiring jurisdiction and one decision locus are required.
  - Headcount must be at least one.
  - Closing requires a valid terminal reason.

## Candidate Inbox Entry

- **Purpose**: Employer-visible row for an approved, delivered candidate match.
- **Fields**:
  - `match_ticket_id`, `identifier`
  - `employer_req_ticket_id`
  - `candidate_label`
  - `match_state`
  - `delivered_at`
  - `dossier_id`
  - `signature_status`
- **Rules**:
  - Only organization-owned delivered matches are visible.
  - In-progress negotiations are not visible.
  - Rows must not expose raw transcript, hidden run state, or seeker-private notes.

## Dossier Projection

- **Purpose**: Employer-side approved dossier content for human review.
- **Fields**:
  - `dossier_id`
  - `match_ticket_id`
  - `summary`
  - `strengths`
  - `risks_or_gaps`
  - `rubric_refs`
  - `signature_metadata`
- **Rules**:
  - Unsigned or invalid-signature dossiers render a warning state.
  - Raw transcripts and private agent reasoning remain unavailable.
