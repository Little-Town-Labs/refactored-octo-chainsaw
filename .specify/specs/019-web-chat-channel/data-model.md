# Data Model: Web-Chat Channel Adapter

## Web-Chat Channel Link

Represents the binding between a bounded Clerk principal/session posture and a Spyglass seeker participant.

**Fields**

- `participantId`: Canonical seeker participant identifier.
- `principalId`: Bounded Clerk principal reference, never a secret.
- `status`: `verified`, `pending`, `disabled`, `paused`, `withdrawn`, or `unknown`.
- `allowedThreadIds`: Threads this link can address.
- `verificationContext`: Optional pending verification/resume context.
- `updatedAt`: Timestamp used for stale-posture decisions.

**Validation Rules**

- Canonical input is allowed only for `verified` links or explicit pending verification/resume flows.
- Disabled, paused, withdrawn, unknown, and wrong-thread links refuse before canonical message creation.

## Web-Chat Session Binding

Represents authenticated session posture supplied by the web/auth layer.

**Fields**

- `sessionId`: Bounded session reference suitable for idempotency and audit correlation.
- `principalId`: Authenticated Clerk principal reference.
- `issuedAt` and `expiresAt`: Session validity window.
- `assurance`: Session trust posture supplied by the auth layer.
- `nativeRefs`: Bounded metadata such as environment or auth provider reference.

**Validation Rules**

- Missing, expired, or principal-mismatched sessions refuse canonical input.
- Session tokens, Clerk secrets, cookies, and raw auth artifacts are not valid fields.

## Web-Chat Client Event

Represents a bounded client-submitted event from the web-chat surface.

**Fields**

- `eventId`: Client event identifier for retries.
- `eventKind`: `text`, `action`, `verification`, `acknowledgement`, `status`, or `attachment_reference`.
- `threadId`: Target web-chat thread.
- `actionId`: Optional stable action/control identifier.
- `content`: User-controlled text or bounded payload.
- `clientContext`: Bounded route, locale, referrer, user-agent-adjacent, and timestamp metadata.

**Validation Rules**

- All client-controlled text and metadata are untrusted.
- Empty, over-size, malformed, expired-action, wrong-thread, or unsupported events refuse.

## Web-Chat Render Model

Represents a safe outbound view model derived from an approved canonical outbound message.

**Fields**

- `renderId`: Stable render identifier.
- `threadId`: Target web-chat thread.
- `messageParts`: Approved text, status, fallback, and structured parts.
- `actions`: Optional bounded controls with labels, enabled state, and action identity.
- `accessibility`: Required accessibility contract fields.
- `nativeRefs`: Bounded non-semantic metadata.

**Validation Rules**

- Render models require approved projection or system-generated content.
- Raw counterparty records, transcripts, dossier internals, Clerk secrets, session tokens, and hidden Parley state are invalid inputs.

## Web-Chat Delivery/Status Result

Represents provider-neutral outcome from rendering or client status events.

**Fields**

- `messageId`: Canonical message or render identifier.
- `status`: `rendered`, `displayed`, `acknowledged`, `retryable_failure`, `terminal_failure`, `expired`, `cancelled`, `refused`, `unsupported`, or `duplicate`.
- `reasonCode`: Optional structured reason.
- `retryAfter`: Optional retry posture.
- `nativeRefs`: Bounded non-semantic client/render references.

**Validation Rules**

- Terminal statuses cannot be overwritten by later non-terminal statuses.
- Duplicate status events do not create new transitions.

## Web-Chat Adapter Capability

Declares web-chat supported content, action, accessibility, retry, and status behavior.

**Fields**

- `channel`: `web_chat`.
- `supportedEventKinds`: Accepted inbound event kinds.
- `supportedContentParts`: Renderable outbound content parts.
- `limits`: Text length, action count, attachment reference posture, and metadata bounds.
- `authPosture`: Clerk-authenticated and pending-link requirements.
- `accessibilityPosture`: WCAG-facing contract commitments.
- `deliveryPosture`: Supported statuses and retry behavior.

## Web-Chat Audit Event

Immutable evidence for adapter decisions.

**Event Types**

- `web_chat.normalized`
- `web_chat.refused`
- `web_chat.duplicate`
- `web_chat.rendered`
- `web_chat.delivery_status_recorded`
- `web_chat.accessibility_contract_validated`
- `web_chat.unsupported_intent_refused`
- `web_chat.capability_registered`

**Validation Rules**

- Audit events include actor/session/thread correlation, structured reason/status, bounded native references, and no raw secrets.
