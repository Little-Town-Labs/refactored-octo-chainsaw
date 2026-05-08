// F02 T022 — Clerk event → PrincipalSnapshot translation.
//
// Pure function: given a parsed Clerk event and the operator-org
// configuration, produce a `PrincipalSnapshot` ready for the
// materializer (or null if the event does not require materialization).
//
// `user.created` / `user.updated` produce a seeker-tier snapshot
// since the Clerk-side user has no org context yet (the seeker is a
// single-user account; an employer/operator user only becomes
// non-seeker once an organizationMembership event lands).
//
// `organizationMembership.{created,updated}` produces an
// employer/operator snapshot. The `org_kind` is decided by the
// caller's `operatorClerkOrgIds` allowlist — operator membership is
// not self-asserted by Clerk, only by the Spyglass-side configuration
// (FR-9: operator role membership is managed by Spyglass-side
// configuration, not by self-service in Clerk).

import type { HumanTier } from "../principal.js";
import type { PrincipalSnapshot } from "../materialize/types.js";
import type { ClerkWebhookEvent } from "./clerk-events.js";

export interface SnapshotContext {
  /**
   * Set of Clerk org IDs that map to the Spyglass-side operator
   * Organization. Configured per environment (FR-9).
   */
  readonly operatorClerkOrgIds: ReadonlySet<string>;
}

export interface TerminationDirective {
  readonly kind: "disable";
  readonly external_id: string;
  readonly org_clerk_id: string | null;
  readonly reason: string;
}

export type SnapshotResult =
  | { readonly kind: "materialize"; readonly snapshot: PrincipalSnapshot }
  | TerminationDirective
  | { readonly kind: "ignore" };

function clerkRoleToTier(role: string): "employer_admin" | "employer_member" {
  // Clerk's default org-admin role is "org:admin"; older envs use
  // bare "admin". Anything else maps to member.
  return role === "org:admin" || role === "admin" ? "employer_admin" : "employer_member";
}

function displayNameOf(first?: string | null, last?: string | null): string | undefined {
  const composed = [first, last].filter(Boolean).join(" ").trim();
  return composed.length > 0 ? composed : undefined;
}

export function eventToSnapshot(event: ClerkWebhookEvent, ctx: SnapshotContext): SnapshotResult {
  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const displayName = displayNameOf(event.data.first_name, event.data.last_name);
      const snap: PrincipalSnapshot = {
        external_id: event.data.id,
        tier: "seeker",
        ...(displayName ? { display_name: displayName } : {}),
      };
      return { kind: "materialize", snapshot: snap };
    }

    case "user.deleted": {
      return {
        kind: "disable",
        external_id: event.data.id,
        org_clerk_id: null,
        reason: "clerk.user.deleted",
      };
    }

    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const orgClerkId = event.data.organization.id;
      const isOperator = ctx.operatorClerkOrgIds.has(orgClerkId);
      const tier: HumanTier = isOperator ? "operator" : clerkRoleToTier(event.data.role);
      const orgKind: "employer" | "operator" = isOperator ? "operator" : "employer";
      const displayName = displayNameOf(
        event.data.public_user_data.first_name,
        event.data.public_user_data.last_name,
      );
      const snap: PrincipalSnapshot = {
        external_id: event.data.public_user_data.user_id,
        tier,
        org_clerk_id: orgClerkId,
        org_kind: orgKind,
        ...(event.data.organization.name ? { org_display_name: event.data.organization.name } : {}),
        ...(displayName ? { display_name: displayName } : {}),
      };
      return { kind: "materialize", snapshot: snap };
    }

    case "organizationMembership.deleted": {
      return {
        kind: "disable",
        external_id: event.data.public_user_data.user_id,
        org_clerk_id: event.data.organization.id,
        reason: "clerk.organizationMembership.deleted",
      };
    }

    case "session.removed": {
      // Sessions are managed by Clerk; F02 does not need to write
      // anything on session.removed beyond letting the audit
      // pipeline see it. The webhook handler emits its own audit
      // event; here we just signal "no materialization needed."
      return { kind: "ignore" };
    }
  }
}
