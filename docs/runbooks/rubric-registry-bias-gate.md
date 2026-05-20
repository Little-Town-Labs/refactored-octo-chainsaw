# Rubric Registry + Bias-Test Dispatch Gate Runbook

## Purpose

F07b owns immutable rubric versions, bias-test artifact registration,
dispatch-time bias-test enforcement, deterministic weighted scoring, and
review reads. Production dispatch must refuse rubrics that do not have
completed bias-test evidence bound to the exact rubric content hash.

## Publish A Rubric

1. Confirm the rubric dimensions, score ranges, weights, aggregation
   policy, and description are reviewed.
2. Register or identify a completed bias-test artifact for the exact
   rubric content hash.
3. Publish with a principal holding `rubric.publish`, reviewer
   attribution, reason code, correlation id, and canonical audit writer.
4. Verify `(rubric_id, version)` cannot be republished with different
   material.

## Register Bias-Test Evidence

1. Confirm the artifact names a methodology ref and jurisdiction
   coverage.
2. For dispatch eligibility, status must be `completed` and include
   reviewer, completion timestamp, artifact URI, and audit evidence.
3. Confirm `rubric_content_hash` matches the published rubric version.
4. Expired, draft, rejected, superseded, or hash-mismatched artifacts do
   not unlock production dispatch.

## Dispatch Gate

1. Resolve the contract-pinned rubric ref.
2. Refuse missing, unpublished, deprecated, or invalid rubric refs.
3. In production posture, require `bias_test_ref`.
4. Load the artifact and refuse incomplete, expired, hash-mismatched, or
   insufficient jurisdiction coverage.
5. Record dispatch refusals as non-PII evidence with stable reason codes.

## Deterministic Scoring

1. Validate each required dimension has a score.
2. Reject scores outside the dimension range.
3. Normalize weights and compute the weighted total with the documented
   rounding policy.
4. Ignore any model-produced holistic score and emit a regression signal.

## Review Reads

Reviewers need `rubric.read`. Reads are bounded and expose rubric,
bias-test, and dispatch-gate metadata only; they do not expose raw
applicant or transcript content.

## Rollback

Rubric versions are immutable. Do not mutate a bad version. Publish a new
version or deprecate the old version for new dispatch while preserving
historical reconstruction.
