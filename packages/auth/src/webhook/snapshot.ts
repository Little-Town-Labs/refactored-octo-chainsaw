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
//
// `invitation.*` / `organizationInvitation.*` events mirror invitation
// lifecycle evidence only. They do not materialize principals; the
// accepted-user authority still arrives through Clerk membership
// events.

import { createHash } from "node:crypto";

import type { HumanTier } from "../principal.js";
import type {
  ClerkInvitationRecordInput,
  ClerkInvitationStatus,
  PrincipalSnapshot,
} from "../materialize/types.js";
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
  | { readonly kind: "mirror_invitation"; readonly invitation: ClerkInvitationRecordInput }
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

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function optionalTimestamp(value: unknown): Date | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value) : null;
}

function isInvitationStatus(value: unknown): value is ClerkInvitationStatus {
  return value === "pending" || value === "accepted" || value === "revoked" || value === "expired";
}

function statusFromInvitationEvent(event: ClerkWebhookEvent): ClerkInvitationStatus {
  if (event.type.endsWith(".accepted")) return "accepted";
  if (event.type.endsWith(".revoked")) return "revoked";
  if (event.type.endsWith(".expired")) return "expired";
  if ("status" in event.data && isInvitationStatus(event.data.status)) return event.data.status;
  return "pending";
}

function emailHash(email: string | null): string | null {
  if (email === null) return null;
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function organizationIdFromInvitationData(data: Record<string, unknown>): string | null {
  const direct = optionalString(data.organization_id) ?? optionalString(data.organizationId);
  if (direct) return direct;
  const snake = data.public_organization_data;
  if (snake && typeof snake === "object") {
    const value = optionalString((snake as { id?: unknown }).id);
    if (value) return value;
  }
  const camel = data.publicOrganizationData;
  if (camel && typeof camel === "object") {
    return optionalString((camel as { id?: unknown }).id);
  }
  return null;
}

function invitationToRecord(event: ClerkWebhookEvent): ClerkInvitationRecordInput {
  const data = event.data as Record<string, unknown>;
  const email = optionalString(data.email_address) ?? optionalString(data.emailAddress);
  return {
    clerk_invitation_id: String(data.id),
    family: event.type.startsWith("organizationInvitation.") ? "organization" : "application",
    status: statusFromInvitationEvent(event),
    email_hash: emailHash(email),
    org_clerk_id: organizationIdFromInvitationData(data),
    role: optionalString(data.role),
    last_event_type: event.type,
    clerk_created_at: optionalTimestamp(data.created_at ?? data.createdAt),
    clerk_updated_at: optionalTimestamp(data.updated_at ?? data.updatedAt),
    expires_at: optionalTimestamp(data.expires_at ?? data.expiresAt),
  };
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

    case "invitation.created":
    case "invitation.updated":
    case "invitation.accepted":
    case "invitation.revoked":
    case "invitation.expired":
    case "organizationInvitation.created":
    case "organizationInvitation.updated":
    case "organizationInvitation.accepted":
    case "organizationInvitation.revoked":
    case "organizationInvitation.expired": {
      return { kind: "mirror_invitation", invitation: invitationToRecord(event) };
    }
  }
}
