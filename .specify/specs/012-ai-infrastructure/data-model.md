# Data Model: F12 AI Infrastructure

## Prompt Version

Immutable versioned prompt template for a governed agent/runtime purpose.

Fields:

- `prompt_id`: Stable logical prompt id.
- `version`: Immutable version string.
- `status`: `draft`, `published`, `deprecated`, `retired`, or `superseded`.
- `purpose`: Agent/runtime use case such as seeker advocate, employer advocate, Parley summary, or evaluation fixture.
- `template_ref`: Pointer to approved prompt content source.
- `content_hash`: Deterministic hash of canonical prompt content.
- `variable_contract`: Required and optional variable names, types, trust classes, and sentinel expectations.
- `allowed_scopes`: Caller scopes or contract refs allowed to use this version.
- `rubric_boundary`: Evidence that rubric weights/scoring policy are not embedded.
- `release_manifest_ref`: Manifest that first released this version.
- `signature_ref`: Signature or attestation evidence.
- `published_by`: Principal that published the version.
- `published_at`: Publication timestamp.
- `audit_event_id`: Audit evidence ref.

Validation:

- `(prompt_id, version)` is unique and immutable.
- Published versions require `content_hash`, `variable_contract`, `release_manifest_ref`, `signature_ref`, `published_by`, `published_at`, and `audit_event_id`.
- Published prompt versions must not contain rubric weights or scoring policy.
- Retired/superseded versions remain readable for runs and invocation records that pin them.

## Model Profile Version

Immutable approved model selection and risk/cost profile.

Fields:

- `model_profile_id`: Stable logical model profile id.
- `version`: Immutable version string.
- `status`: `draft`, `published`, `deprecated`, `retired`, or `superseded`.
- `provider`: Approved provider id.
- `model`: Provider model identity.
- `capability_class`: `chat`, `reasoning`, `embedding`, `classification`, or `evaluation`.
- `risk_tier`: Platform risk classification for the model use.
- `allowed_scopes`: Caller scopes or contract refs allowed to use this version.
- `cost_metadata`: Pricing evidence, token units, ceiling hints, and pricing timestamp.
- `supply_chain_evidence`: Model card, provider attestation, exception refs, or equivalent release evidence.
- `release_manifest_ref`: Manifest that first released this version.
- `signature_ref`: Signature or attestation evidence.
- `published_by`: Principal that published the version.
- `published_at`: Publication timestamp.
- `audit_event_id`: Audit evidence ref.

Validation:

- `(model_profile_id, version)` is unique and immutable.
- Published versions require provider/model identity, capability class, cost metadata, supply-chain evidence, signature evidence, and audit refs.
- Retired versions cannot be selected by new manifests but remain reviewable.

## AI Runtime Manifest

Signed release artifact that freezes AI runtime posture.

Fields:

- `manifest_id`: Unique manifest id.
- `version`: Manifest version.
- `status`: `draft`, `active`, `superseded`, `retired`, or `revoked`.
- `deployment_scope`: Release, environment, package, or agent-contract scope.
- `prompt_refs`: Prompt versions included in the release.
- `model_refs`: Model profile versions included in the release.
- `caller_scopes`: Agent/runtime callers authorized by the manifest.
- `provider_allowlist`: Providers and model profiles permitted for invocation.
- `cost_controls`: Per-run, per-match, per-caller, and release-level cost ceilings.
- `fallback_policy`: `none`, `refuse`, or manifest-authorized fallback refs.
- `no_hot_reload`: Boolean posture flag; production manifests require true.
- `content_hash`: Deterministic hash of canonical manifest content.
- `signature_ref`: Signature or attestation evidence.
- `published_by`: Principal that published the manifest.
- `published_at`: Publication timestamp.
- `audit_event_id`: Audit evidence ref.

Validation:

- Active manifests require `no_hot_reload=true`.
- Active manifests must reference only published prompt/model versions.
- Manifest content hash and signature must verify before dispatch or invocation use.
- Superseding a manifest does not mutate invocation records or runs that pinned the prior manifest.

## Model Invocation Record

Auditable record for an accepted or refused model invocation request.

Fields:

- `invocation_id`: Unique invocation id.
- `status`: `accepted`, `refused`, `completed`, `failed`, or `usage_incomplete`.
- `caller_principal_id`: Agent, service, or operator principal.
- `caller_scope`: Scope used for authorization.
- `run_ref`: Parley run, dispatch, match, or staged-run ref.
- `purpose`: Invocation purpose.
- `prompt_ref`: Prompt version used or requested.
- `model_ref`: Model profile version used or requested.
- `manifest_ref`: Runtime manifest used or requested.
- `request_hash`: Deterministic hash of canonical request envelope.
- `rendered_prompt_hash`: Hash of rendered prompt content when invocation is accepted.
- `response_hash`: Hash of response content when available.
- `usage_metadata`: Provider usage metadata when available.
- `cost_evidence`: Estimate, actual usage cost, pricing evidence, and ceiling decision.
- `decision`: `allowed`, `refused`, or `downgraded`.
- `reason_code`: Stable reason code.
- `started_at`, `completed_at`: Invocation timing evidence.
- `audit_event_id`: Audit evidence ref.

Validation:

- Accepted invocations require caller, run, prompt, model, manifest, request hash, and audit refs.
- Refused invocations require reason code and audit ref.
- Missing usage metadata after an accepted invocation sets `status=usage_incomplete` or records equivalent risk evidence.

## Cost Control Policy

Budget envelope embedded in a manifest or associated policy event.

Fields:

- `policy_id`: Stable policy id.
- `version`: Immutable version string.
- `scope`: `run`, `match`, `caller`, `manifest`, or `release`.
- `ceiling`: Numeric budget amount and unit.
- `pricing_evidence_ref`: Pricing source used for estimates.
- `on_preflight_exceeded`: `refuse` or `downgrade`.
- `on_post_usage_exceeded`: `audit`, `alert`, `block_future`, or `escalate`.
- `effective_from`, `effective_until`: Applicability window.

Validation:

- Ceilings must be non-negative.
- Downgrade behavior requires a manifest-authorized fallback model ref.
- Active policies require pricing evidence.

## AI Operation Refusal

Structured refusal result shared by publication, manifest, rendering, and invocation paths.

Fields:

- `operation`: `publish_prompt`, `publish_model`, `publish_manifest`, `render_prompt`, `invoke_model`, or `review_read`.
- `reason_code`: Stable reason code.
- `message`: Safe operator-facing explanation.
- `refs`: Prompt, model, manifest, caller, run, or policy refs involved.
- `audit_event_id`: Audit evidence ref when available.

Reason codes:

- `missing_required_ref`
- `unauthorized_caller`
- `prompt_not_published`
- `model_not_published`
- `manifest_not_active`
- `manifest_signature_invalid`
- `provider_not_allowed`
- `model_not_allowed`
- `budget_preflight_exceeded`
- `budget_fallback_unavailable`
- `prompt_variable_missing`
- `prompt_variable_unexpected`
- `unsafe_prompt_variable`
- `rubric_policy_in_prompt`
- `audit_unavailable`
- `gateway_unavailable`
- `usage_metadata_missing`
- `unscoped_review`
