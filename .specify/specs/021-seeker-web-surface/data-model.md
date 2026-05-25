# Data Model: Seeker Web Surface

## Seeker Landing Surface

- **Purpose**: Public human-readable entry point.
- **Fields**:
  - `title`: Human-readable product name.
  - `positioning`: Short explanation that Spyglass is a conversation-first seeker advocate.
  - `supported_channels`: Telegram, email, and web chat onboarding paths.
  - `account_actions`: Signup, login, and profile/account links.
  - `boundary_statement`: No dashboard, ticket list, analytics, recommended jobs, or browse jobs.
  - `agent_doc_links`: Links to `/agents.md`, `/llms.txt`, and A2A card index.
- **Validation rules**:
  - Must not expose private ticket, dossier, transcript, or scoring data.
  - Must not link to prohibited seeker product surfaces.
  - Must provide accessible headings, landmarks, and link names.

## Clerk Account Entry Point

- **Purpose**: Route or link into Clerk-hosted account surfaces.
- **Fields**:
  - `kind`: `sign_up`, `sign_in`, or `profile`.
  - `audience`: `seeker`.
  - `href`: Stable internal or Clerk-hosted route.
  - `requires_auth`: Boolean.
- **Validation rules**:
  - Must not duplicate Clerk profile data into a custom dashboard.
  - Must not expose employer/operator surfaces to seeker calls to action.

## Agent Instructions Document

- **Purpose**: `/agents.md` instructions for autonomous browsing agents.
- **Fields**:
  - `overview`
  - `human_entry_points`
  - `agent_entry_points`
  - `a2a_card_locations`
  - `unsupported_actions`
  - `governance_references`
  - `contact_or_followup`
- **Validation rules**:
  - Must state that A2A is discovery/future interop and not required for v0 customer flow.
  - Must not advertise seeker APIs or dashboard capabilities.

## LLM Instructions Document

- **Purpose**: `/llms.txt` public instructions for LLM/crawler behavior.
- **Fields**:
  - `site_summary`
  - `public_paths`
  - `disallowed_uses`
  - `privacy_boundary`
  - `a2a_discovery_pointer`
- **Validation rules**:
  - Must not include private operational details.
  - Must distinguish public content from non-public source/governance artifacts.

## A2A Card Index

- **Purpose**: Public list of A2A cards and stable card URLs.
- **Fields**:
  - `version`
  - `generated_at` or stable publication date
  - `cards`: List of card summaries.
- **Relationships**:
  - References five A2A Agent Card records.
- **Validation rules**:
  - Every listed card URL must resolve.
  - Unknown cards must not be listed.

## A2A Agent Card

- **Purpose**: Public discovery document for one candidate agent role.
- **Fields**:
  - `id`: `seeker-intake`, `employer-intake`, `match-coordinator`, `negotiation-participant`, or `dossier-reader`.
  - `name`
  - `audience`
  - `description`
  - `capabilities`
  - `auth`
  - `availability`
  - `runtime_status`
  - `unsupported_actions`
  - `contact`
  - `docs`
- **Validation rules**:
  - `runtime_status` must not imply live protocol behavior unless implemented.
  - `unsupported_actions` must include dashboard/job-listing and hidden-state boundaries where relevant.

## No-Dashboard Guard

- **Purpose**: Public route/content policy that prevents prohibited seeker product surfaces.
- **Fields**:
  - `prohibited_paths`
  - `prohibited_terms`
  - `allowed_redirect_or_response`
  - `evidence`
- **Validation rules**:
  - Prohibited paths must not render product dashboards.
  - Tests must fail if landing/docs/cards introduce prohibited links or claims.
