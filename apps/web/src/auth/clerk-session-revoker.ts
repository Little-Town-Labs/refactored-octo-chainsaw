// F02 T026 — Clerk-backed session revoker (FR-34, ≤60s SLA).
//
// Production implementation of `ClerkSessionRevoker`. Resolves the
// Clerk userId from the IdP external id, lists active sessions, and
// revokes each one. Per Constitution §I.6 (fail-safe deny), failures
// propagate so the caller doesn't acknowledge the webhook before the
// revocation succeeds.

import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { ClerkSessionRevoker } from "@spyglass/auth";

export function createClerkSessionRevoker(): ClerkSessionRevoker {
  return {
    async revokeAllSessionsForUser({ external_id, reason }) {
      const client = await clerkClient();
      const sessions = await client.sessions.getSessionList({ userId: external_id });
      const revocations = sessions.data
        .filter((s) => s.status === "active")
        .map((s) => client.sessions.revokeSession(s.id));
      await Promise.all(revocations);
      void reason;
    },
  };
}
