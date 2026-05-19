// F04 B5 — ticket transition audit event helpers.
//
// Repos call these helpers from inside the same transaction that mutates
// ticket rows. If the audit insert fails, the surrounding transaction
// rolls back with the domain mutation (NFR-4).

import type { Principal } from "@spyglass/auth";
import type { AuditEventsBufferRow } from "@spyglass/db";

import type { TicketKind } from "./states.js";

export interface TicketTransitionAuditPayload {
  readonly ticket_id: string;
  readonly ticket_identifier: string;
  readonly ticket_kind: "seeker" | "employer_req" | "match";
  readonly from_state: string;
  readonly to_state: string;
  readonly reason_code?: string;
  readonly notes_present?: boolean;
  readonly run_id?: string | null;
  readonly dossier_id?: string | null;
  readonly attempt?: number;
  readonly seeker_ticket_id?: string;
  readonly employer_req_ticket_id?: string;
  readonly actor_principal_id?: string;
}

export interface TicketTransitionAuditEvent {
  readonly event_name: string;
  readonly principal_id: string;
  readonly principal_kind: Principal["kind"];
  readonly role_or_scope: string | null;
  readonly correlation_id: string;
  readonly payload: TicketTransitionAuditPayload;
}

export type InsertAuditEvent = Omit<AuditEventsBufferRow, "event_id" | "created_at">;

export interface TicketAuditWriter {
  insertAuditEvent(event: InsertAuditEvent): Promise<void>;
}

function auditKind(kind: TicketKind): TicketTransitionAuditPayload["ticket_kind"] {
  switch (kind) {
    case "seeker_ticket":
      return "seeker";
    case "employer_req_ticket":
      return "employer_req";
    case "match_ticket":
      return "match";
  }
}

function eventPrefix(kind: TicketKind): string {
  switch (kind) {
    case "seeker_ticket":
      return "seeker_ticket";
    case "employer_req_ticket":
      return "employer_req_ticket";
    case "match_ticket":
      return "match_ticket";
  }
}

export function principalRoleOrScope(principal: Principal): string | null {
  if (principal.kind === "human") return principal.tier;
  if ("scopes" in principal) return principal.scopes.join(" ") || null;
  return null;
}

export function principalScopes(principal: Principal, override?: ReadonlyArray<string>): string[] {
  if (override) return [...override];
  if ("scopes" in principal) return [...principal.scopes];
  return [];
}

export interface BuildTransitionEventArgs {
  readonly kind: TicketKind;
  readonly ticketId: string;
  readonly identifier: string;
  readonly from: string;
  readonly to: string;
  readonly principal: Principal;
  readonly reason_code?: string;
  readonly notes?: string;
  readonly transitionName?: string;
  readonly extra?: Omit<
    Partial<TicketTransitionAuditPayload>,
    "ticket_id" | "ticket_identifier" | "ticket_kind" | "from_state" | "to_state"
  >;
}

export function buildTransitionAuditEvent(
  args: BuildTransitionEventArgs,
): TicketTransitionAuditEvent {
  const transitionName = args.transitionName ?? args.to;
  const payload: TicketTransitionAuditPayload = {
    ticket_id: args.ticketId,
    ticket_identifier: args.identifier,
    ticket_kind: auditKind(args.kind),
    from_state: args.from,
    to_state: args.to,
    ...(args.reason_code ? { reason_code: args.reason_code } : {}),
    ...(args.notes !== undefined ? { notes_present: args.notes.length > 0 } : {}),
    ...(args.extra ?? {}),
  };

  return {
    event_name: `${eventPrefix(args.kind)}.${transitionName}`,
    principal_id: args.principal.principal_id,
    principal_kind: args.principal.kind,
    role_or_scope: principalRoleOrScope(args.principal),
    correlation_id: args.principal.correlation_id,
    payload,
  };
}

export async function emitTransitionAuditEvent(
  writer: TicketAuditWriter,
  event: TicketTransitionAuditEvent,
): Promise<void> {
  await writer.insertAuditEvent({
    event_name: event.event_name,
    principal_id: event.principal_id,
    principal_kind: event.principal_kind,
    role_or_scope: event.role_or_scope,
    correlation_id: event.correlation_id,
    payload: event.payload as unknown as Record<string, unknown>,
  });
}
