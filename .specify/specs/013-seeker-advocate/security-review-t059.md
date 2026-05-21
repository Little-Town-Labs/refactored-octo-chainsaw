# F13 Security Review Notes

Date: 2026-05-21

## Findings

No blocking security findings.

## Controls Verified

- Direct provider imports are detected and rejected by package tests.
- Model operations route through `@spyglass/ai`.
- Unfiltered employer-confidential payload fields are refused before a
  seeker turn is produced.
- Prior-run context is refused when the context `run_id` differs from the
  active run.
- Human-input pause semantics are refused by input/tool and output checks.
- Budget refusal is included in the eval baseline.

## Residual Risk

Prompt-injection handling currently depends on F12/F09 sentinel and
variable-contract behavior plus deterministic eval fixtures. Add live
red-team prompt cases before any production hiring posture.
