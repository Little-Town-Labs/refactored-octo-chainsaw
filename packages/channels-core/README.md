# @spyglass/channels-core

**Status:** alpha — F01 placeholder; populated in F16 (channel adapter
framework + `ChannelMessage` interface).

The shared adapter interface every seeker channel implements.
Concrete channels (Telegram, email, web chat, A2A delegate) live in
their own packages and conform to this contract.

## Public API

To be defined in F16. Will export `ChannelMessage` (typed envelope),
adapter interface, and channel-lifecycle types.

## Dependencies

`@spyglass/shared` only.

## Stability tier

Alpha until F16 ships; the `ChannelMessage` interface is a stable
contract once frozen, with breaking changes following Constitution
§III.3.
