# @spyglass/channels-core

**Status:** alpha — F16 channel adapter framework.

The shared adapter interface every seeker channel implements.
Concrete channels (Telegram, email, web chat, A2A delegate) live in
their own packages and conform to this contract.

## Public API

F16 exports:

- `ChannelMessage`: canonical inbound/outbound envelope for seeker channels.
- `ChannelAdapter`: thin transport boundary for normalize/render/ack/report.
- Capability profiles for rich realtime chat, async threaded email, and
  plain-text fallback.
- Delivery outcomes, refusal reason codes, conformance helpers, fixtures, and
  audit-ready event builders.

Adapters translate native provider payloads to and from `ChannelMessage`.
They do not own seeker product state machines, Parley negotiation state,
scoring logic, dossier construction, or disclosure policy.

## Out of scope

Concrete Telegram, email, and web-chat adapters ship in F17, F18, and F19.
The full seeker conversational product flow ships in F20. A2A seeker-delegate
is modeled as a future smart channel, not a v0 executable adapter.

## Dependencies

`@spyglass/shared` only.

## Stability tier

Alpha until F16 ships; the `ChannelMessage` interface is a stable contract
once frozen, with breaking changes following Constitution §III.3.
