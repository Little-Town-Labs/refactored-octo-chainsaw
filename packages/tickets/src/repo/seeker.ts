import type { Principal } from "@spyglass/auth";
import type { NewSeekerTicketRow, SeekerTicketRow, SeekerTicketState } from "@spyglass/db";

import {
  buildTransitionAuditEvent,
  emitTransitionAuditEvent,
  principalScopes,
  type BuildTransitionEventArgs,
} from "../audit.js";
import { assertTransition, OPERATOR_TRANSITION_SCOPE } from "../transitions.js";
import type { TicketStore } from "./store.js";

export interface SeekerDraftFields {
  readonly role_family: string;
  readonly comp_band_min: number;
  readonly comp_band_max: number;
  readonly currency: string;
  readonly jurisdictions: string[];
  readonly work_mode: NewSeekerTicketRow["work_mode"];
  readonly flags?: string[];
}

export interface SeekerTransitionArgs {
  readonly seeker_ticket_id: string;
  readonly to: SeekerTicketState;
  readonly principal: Principal;
  readonly reason_code?: string;
  readonly notes?: string;
  readonly scopes?: ReadonlyArray<string>;
}

export interface SeekerRepoOptions {
  readonly store: TicketStore;
  readonly allocateIdentifier: () => Promise<string>;
}

export function createSeekerRepo(options: SeekerRepoOptions) {
  return {
    async insertDraft(principal: Principal, fields: SeekerDraftFields): Promise<SeekerTicketRow> {
      return options.store.transaction(async (tx) => {
        const identifier = await options.allocateIdentifier();
        return tx.insertSeekerDraft({
          principal_id: principal.principal_id,
          identifier,
          state: "draft",
          role_family: fields.role_family,
          comp_band_min: fields.comp_band_min,
          comp_band_max: fields.comp_band_max,
          currency: fields.currency,
          jurisdictions: fields.jurisdictions,
          work_mode: fields.work_mode,
          flags: fields.flags ?? [],
        });
      });
    },

    async transition(args: SeekerTransitionArgs): Promise<SeekerTicketRow> {
      return options.store.transaction(async (tx) => {
        const current = await tx.getSeeker(args.seeker_ticket_id);
        if (!current) throw new Error(`seeker ticket not found: ${args.seeker_ticket_id}`);

        assertTransition(
          { kind: "seeker_ticket", from: current.state as SeekerTicketState, to: args.to },
          {
            scopes: principalScopes(args.principal, args.scopes),
            ...(args.reason_code ? { reason_code: args.reason_code } : {}),
          },
        );

        const updated = await tx.updateSeeker(args.seeker_ticket_id, {
          state: args.to,
          updated_at: new Date(),
        });
        const scopes = principalScopes(args.principal, args.scopes);
        const isOperatorTransition = scopes.includes(OPERATOR_TRANSITION_SCOPE);
        const eventArgs: BuildTransitionEventArgs = {
          kind: "seeker_ticket",
          ticketId: updated.seeker_ticket_id,
          identifier: updated.identifier,
          from: current.state,
          to: updated.state,
          principal: args.principal,
          ...(args.reason_code ? { reason_code: args.reason_code } : {}),
          ...(args.notes !== undefined ? { notes: args.notes } : {}),
          ...(isOperatorTransition
            ? {
                transitionName: "operator_transition",
                extra: { actor_principal_id: args.principal.principal_id },
              }
            : {}),
        };
        await emitTransitionAuditEvent(tx, buildTransitionAuditEvent(eventArgs));
        return updated;
      });
    },
  };
}
