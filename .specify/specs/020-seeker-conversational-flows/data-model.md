# Data Model: Conversational Onboarding and Seeker Product Flows

## SeekerConversationSession

Represents one channel-agnostic product-flow context.

- `sessionId`: stable flow session id.
- `seekerId`: authenticated seeker principal id.
- `channel`: `telegram`, `email`, or `web-chat`.
- `channelLinkId`: verified channel-link or session binding id.
- `flowFamily`: `onboarding`, `match-notification`, `dossier-review`, `controls`, `aggregate-insight`, `demographic-consent`, or `refusal`.
- `currentPromptId`: active prompt id when a response is expected.
- `ticketId`: active seeker ticket id when known.
- `correlationId`: audit and delivery correlation id.
- `idempotencyKey`: stable key for inbound event or scheduled work.
- `status`: `open`, `awaiting-response`, `completed`, `refused`, or `blocked`.

Validation rules:
- Must have verified participant/channel posture before mutation.
- Must never contain raw provider payloads beyond bounded canonical references.
- One inbound idempotency key can produce at most one product mutation result.

## SeekerTicketProductState

Conversational projection of the seeker ticket lifecycle.

- `ticketId`: seeker ticket id.
- `seekerId`: seeker principal id.
- `state`: `onboarding`, `active`, `paused`, `in-conversation`, `hired`, `withdrawn`, or `closed`.
- `profileComplete`: boolean.
- `jurisdictionAttested`: boolean.
- `thresholdReady`: boolean.
- `lastFlowFamily`: current or last product flow.
- `updatedAt`: timestamp.

State transitions:
- `onboarding -> active` only when required profile, threshold, and jurisdiction posture are accepted.
- `active -> paused -> active` for authorized pause/resume.
- `active|paused|in-conversation -> withdrawn|closed` for terminal controls.
- Paused, withdrawn, hired, and closed states block inappropriate notifications and scheduled prompts.

## SeekerProfileDraft

Bounded untrusted seeker-provided resume/profile material plus validated structured fields.

- `profileDraftId`: stable draft id.
- `seekerId`: seeker principal id.
- `resumeTextRef`: bounded text reference, never raw unbounded content in prompts.
- `resumeFileRef`: bounded file reference metadata.
- `structuredFields`: validated matching fields.
- `missingRequiredFields`: ordered required-field list.
- `untrustedInputFlags`: prompt-injection, unsupported attachment, over-size, malformed, or contradictory markers.
- `sourceChannel`: originating channel.
- `updatedAt`: timestamp.

Validation rules:
- All seeker free text is untrusted.
- Over-size, unsupported, malformed, or unsafe attachment references refuse or ask for safe re-submission.
- Raw profile/resume content is not exposed to employer-side surfaces.

## PreferenceThresholdPosture

Current preference and threshold settings for seeker matching.

- `postureId`: stable posture id.
- `seekerId`: seeker principal id.
- `thresholds`: bounded threshold values.
- `preferences`: bounded preference values.
- `validationVersion`: validation policy version.
- `effectiveAt`: timestamp.
- `auditRef`: audit event reference.

Validation rules:
- Values must pass configured ranges and allowed dimensions.
- Confirmation prompt is required after accepted change.
- Duplicate threshold submissions do not create duplicate posture records.

## WorkJurisdictionAttestation

Explicit seeker statement required before active matching posture.

- `attestationId`: stable attestation id.
- `seekerId`: seeker principal id.
- `jurisdiction`: declared work jurisdiction.
- `attestedAt`: timestamp.
- `sourceChannel`: channel where attestation was accepted.
- `policyPostureRef`: policy-gate posture reference.
- `auditRef`: audit event reference.

Validation rules:
- Missing, ambiguous, unsupported, or jurisdiction-disabled posture blocks active matching.
- Phase 1 jurisdiction-set resolution remains outside F20.

## MatchNotificationEvent

Product event derived from threshold/policy decisions and approved seeker projection.

- `eventId`: stable source event id.
- `channel`: target seeker channel for the notification when the caller has already selected a verified channel.
- `matchTicketId`: match ticket id.
- `seekerTicketId`: seeker ticket id.
- `seekerId`: seeker principal id.
- `projectionRef`: approved seeker projection reference.
- `policyDecisionRef`: threshold and policy decision reference.
- `notificationKind`: `threshold-cleared`, `one-side-cleared`, `inconclusive`, or `threshold-check-in`.
- `occurredAt`: timestamp.
- `idempotencyKey`: stable notification key.

Validation rules:
- Requires open/active authorized seeker posture.
- Requires approved seeker projection for notification content.
- Stale, duplicate, closed, unauthorized, projection-missing, or jurisdiction-blocked events fail closed.

## DossierReviewDecision

Seeker response to approved dossier review prompt.

- `decisionId`: stable decision id.
- `matchTicketId`: match ticket id.
- `seekerId`: seeker principal id.
- `decision`: `acknowledge`, `decline`, `request-human-follow-up`, `request-threshold-change`, `pause`, `resume`, or `withdraw`.
- `sourcePromptId`: prompt that authorized the action.
- `notesRef`: optional bounded untrusted text reference.
- `recordedAt`: timestamp.
- `auditRef`: audit event reference.

Validation rules:
- Must be tied to an approved prompt/action identity.
- Must not mutate Parley run internals.
- Hidden-state and raw-data requests become refusal outcomes.

## AggregateInsightReport

Approved aggregate seeker-facing report.

- `reportId`: stable report id.
- `seekerId`: seeker principal id.
- `windowStart`: reporting window start.
- `windowEnd`: reporting window end.
- `aggregateCounts`: approved counts only.
- `aggregateScores`: approved aggregate score summaries only.
- `thresholdCheckIn`: optional bounded prompt.
- `dataSourceRefs`: approved aggregate references.
- `generatedAt`: timestamp.

Validation rules:
- No employer records, ticket lists, analytics dashboards, recommended jobs, or raw match records.
- Paused/withdrawn/closed posture blocks or changes delivery as configured.

## DemographicConsentPosture

Optional consent and segregated storage posture for bias-audit data.

- `postureId`: stable posture id.
- `seekerId`: seeker principal id.
- `state`: `not-asked`, `consented`, `declined`, `withdrawn`, `disabled-counsel`, or `disabled-jurisdiction`.
- `consentVersion`: counsel-approved consent copy version when active.
- `jurisdictionPosture`: jurisdiction gate posture.
- `segregatedDataRef`: reference to bias-audit storage when consented.
- `decidedAt`: timestamp.
- `withdrawnAt`: timestamp when applicable.
- `auditRef`: audit event reference.

Validation rules:
- Decline never blocks onboarding, matching, or notifications.
- Collection requires active consent, counsel-approved UX posture, jurisdiction posture, and segregated data write.
- Withdrawal stops future collection and records audit evidence.

## SeekerFlowAuditEvent

Immutable evidence for flow decisions.

- `auditEventId`: stable audit id.
- `correlationId`: flow correlation id.
- `eventType`: onboarding, profile, jurisdiction, threshold, notification, review, control, insight, consent, refusal, duplicate, or delivery outcome.
- `principalId`: acting principal id.
- `ticketId`: optional seeker or match ticket id.
- `channel`: source or target channel.
- `decision`: accepted, refused, blocked, duplicate, sent, failed, or recorded.
- `reasonCode`: stable reason code.
- `payloadRef`: bounded evidence reference.
- `occurredAt`: timestamp.

Validation rules:
- Audit payloads must avoid raw PII except bounded references permitted by the audit package policy.
- Refusals and duplicate suppressions are audited with stable reason codes.
