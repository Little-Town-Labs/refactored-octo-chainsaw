// `@spyglass/tickets` — Ticket store + state-machine primitives for
// Spyglass. Owned by feature F04; consumed by every later feature
// that creates, advances, or completes a seeker / employer-req /
// match ticket.
//
// F04 currently provides (B1 surface — populated through B7):
//   - Package skeleton (T001)
//
// Coming in later F04 tasks:
//   - Ticket-kind types + state-machine types + assertTransition (B3)
//   - Typed error classes (B3)
//   - Identifier allocator (B4)
//   - Repositories per kind (B5)
//   - Read primitives + cross-side isolation (B6)
//
// Constitutional refs: §I.2 (integrity), §I.5.1–§I.5.3 (AAA),
// §I.6 (defense in depth), §I.A.1 (jurisdiction tagging),
// §II (agent-native).

export const __pkg = "@spyglass/tickets" as const;
