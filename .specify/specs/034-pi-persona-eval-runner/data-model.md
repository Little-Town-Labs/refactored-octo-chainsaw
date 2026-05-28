# Data Model: Pi Persona Eval Adapter

## Persona

- `persona_id`: stable synthetic persona identifier.
- `role`: seeker or employer.
- `label`: human-readable persona label.
- `traits`: synthetic characteristics used to shape prompts.
- `risk_tags`: safety or evaluation risk markers.
- `prompt_seed_ref`: safe prompt seed reference.

Validation rules:

- Persona id, role, label, and prompt seed ref are required.
- Persona traits must be synthetic and safe to persist.

## Persona Encounter

- `encounter_id`: stable encounter identifier.
- `scenario_id`: product harness scenario id.
- `seeker_persona_id`: seeker persona ref.
- `employer_persona_id`: employer persona ref.
- `category`: strong match, weak match, privacy attack, prompt injection, or related category.
- `prompt_refs`: safe prompt references.
- `expected_outcome`: evaluator target.

Validation rules:

- Both persona ids are required and must exist in the registry.
- Prompt refs must be safe references rather than raw prompts.

## Pi Agent Driver

- `driver_id`: adapter identifier.
- `provider`: synthetic-pi initially, live Pi later.
- `model`: model ref.
- `runEncounter`: executes an encounter and returns normalized evidence.

Validation rules:

- Driver output must include transcript ref, tool traces, model metadata, usage, latency, cost, outcome, and evaluator summary.

## Transcript Artifact

- `transcript_ref`: safe artifact reference.
- `safe_excerpt`: synthetic safe excerpt.
- `redaction_status`: artifact redaction status.
- `message_count`: number of transcript messages represented.

Validation rules:

- Transcript content must pass recursive safety checks before persistence.

## Tool Trace

- `tool_call_id`: stable tool-call identifier.
- `tool_name`: tool or capability name.
- `intent`: requested intent.
- `decision`: allowed, refused, or skipped.
- `reason_code`: stable reason.

Validation rules:

- Unsafe tool requests must be refused and recorded with deterministic reason codes.

## Evaluator Summary

- `outcome`: strong_match, weak_match, insufficient_evidence, privacy_refusal, unsafe_tool_refusal, or driver_failed.
- `reason_code`: deterministic reason code.
- `score`: numeric synthetic quality score.
- `boundary_passed`: whether privacy/tool boundaries held.
- `evidence_refs`: safe evidence references.
