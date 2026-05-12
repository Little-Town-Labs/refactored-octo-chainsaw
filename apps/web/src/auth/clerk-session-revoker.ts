// F02 T026 — Clerk-backed session revoker (FR-34, ≤60s SLA).
//
// Production implementation of `ClerkSessionRevoker`. Lists every
// active session for the user (paginated to honor the SLA on heavy
// accounts) and revokes each one. Per Constitution §I.6 (fail-safe
// deny), failures propagate so the caller doesn't acknowledge the
// webhook before revocation succeeds.

import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { ClerkSessionRevoker } from "@spyglass/auth";

const PAGE_LIMIT = 100;

export function createClerkSessionRevoker(): ClerkSessionRevoker {
  return {
    async revokeAllSessionsForUser({ external_id }) {
      const client = await clerkClient();
      let offset = 0;
      const ids: string[] = [];
      // Paginate until Clerk returns less than a full page.
      for (;;) {
        const page = await client.sessions.getSessionList({
          userId: external_id,
          limit: PAGE_LIMIT,
          offset,
        });
        for (const s of page.data) {
          if (s.status === "active") ids.push(s.id);
        }
        if (page.data.length < PAGE_LIMIT) break;
        offset += PAGE_LIMIT;
      }
      await Promise.all(ids.map((id) => client.sessions.revokeSession(id)));
    },
  };
}
