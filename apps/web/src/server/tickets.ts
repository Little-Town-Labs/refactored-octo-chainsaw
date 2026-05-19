import { requireScope, withPrincipal, type PrincipalResolver } from "@spyglass/auth";
import { isServicePrincipal, type Principal, type ServicePrincipal } from "@spyglass/auth";
import { getDb } from "@spyglass/db";
import type { MatchTicketRow, MatchTicketState } from "@spyglass/db";
import {
  createDrizzleTicketStore,
  createMatchRepo,
  drizzleSequenceExecutor,
  IdempotencyConflictError,
  InvariantViolationError,
  MATCH_ADVANCE_SCOPE,
  MissingScopeError,
  nextIdentifier,
  type AdvanceMatchArgs,
  type CreateMatchFields,
} from "@spyglass/tickets";

export type TicketProcedureErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR";

export class TicketProcedureError extends Error {
  constructor(
    public readonly code: TicketProcedureErrorCode,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "TicketProcedureError";
  }
}

export interface TicketsProceduresDeps {
  readonly matchRepo: {
    createMatch(fields: CreateMatchFields): Promise<MatchTicketRow>;
    advanceMatch(args: AdvanceMatchArgs): Promise<MatchTicketRow>;
    renegotiate(matchTicketId: string, principal: Principal): Promise<MatchTicketRow>;
  };
}

export type CreateMatchInput = Omit<CreateMatchFields, "principal" | "scopes">;
export interface AdvanceMatchInput {
  readonly match_ticket_id: string;
  readonly to: MatchTicketState;
  readonly dossier_id?: string | null;
  readonly run_id?: string | null;
  readonly reason_code?: string;
}
export interface RenegotiateInput {
  readonly match_ticket_id: string;
}

function requireMatcherService(principal: Principal): ServicePrincipal {
  if (!isServicePrincipal(principal)) {
    throw new TicketProcedureError("UNAUTHORIZED", "Service principal required.", 401);
  }
  try {
    return requireScope(principal, MATCH_ADVANCE_SCOPE);
  } catch (err) {
    if (err instanceof MissingScopeError || err instanceof Error) {
      throw new TicketProcedureError("FORBIDDEN", "Missing tickets.match.advance scope.", 403);
    }
    throw err;
  }
}

function mapProcedureError(err: unknown): never {
  if (err instanceof TicketProcedureError) throw err;
  if (err instanceof IdempotencyConflictError) {
    throw new TicketProcedureError("CONFLICT", err.message, 409);
  }
  if (err instanceof InvariantViolationError) {
    throw new TicketProcedureError("BAD_REQUEST", err.message, 400);
  }
  throw err;
}

export function createTicketsProcedures(deps: TicketsProceduresDeps) {
  return {
    createMatch: withPrincipal<CreateMatchInput, MatchTicketRow>(async ({ principal }, input) => {
      try {
        const service = requireMatcherService(principal);
        return await deps.matchRepo.createMatch({
          ...input,
          principal: service,
          scopes: [MATCH_ADVANCE_SCOPE],
        });
      } catch (err) {
        mapProcedureError(err);
      }
    }),

    advanceMatch: withPrincipal<AdvanceMatchInput, MatchTicketRow>(async ({ principal }, input) => {
      try {
        const service = requireMatcherService(principal);
        return await deps.matchRepo.advanceMatch({
          ...input,
          principal: service,
          scopes: [MATCH_ADVANCE_SCOPE],
        });
      } catch (err) {
        mapProcedureError(err);
      }
    }),

    renegotiate: withPrincipal<RenegotiateInput, MatchTicketRow>(async ({ principal }, input) => {
      try {
        const service = requireMatcherService(principal);
        return await deps.matchRepo.renegotiate(input.match_ticket_id, service);
      } catch (err) {
        mapProcedureError(err);
      }
    }),
  };
}

export function createTicketsProceduresForDb() {
  const db = getDb();
  const store = createDrizzleTicketStore(db);
  return createTicketsProcedures({
    matchRepo: createMatchRepo({
      store,
      allocateIdentifier: (kind) => nextIdentifier({ kind, executor: drizzleSequenceExecutor(db) }),
    }),
  });
}

export type TicketsProcedures = ReturnType<typeof createTicketsProcedures>;
export type TicketProcedureCaller = ReturnType<TicketsProcedures["createMatch"]>;

export function resolverForPrincipal(principal: Principal | null): PrincipalResolver {
  return {
    async resolve() {
      return principal;
    },
  };
}
