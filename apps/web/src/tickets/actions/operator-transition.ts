"use server";

import {
  createDrizzleTicketStore,
  createEmployerReqRepo,
  createMatchRepo,
  createSeekerRepo,
  drizzleSequenceExecutor,
  nextIdentifier,
  OPERATOR_TRANSITION_SCOPE,
} from "@spyglass/tickets";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../auth/get-principal";
import { operatorTransitionForPrincipal } from "./operator-transition-core";
import type { SubmitTicketResult } from "./submit-results";

export async function operatorTransition(formData: FormData): Promise<SubmitTicketResult> {
  const principal = await getPrincipal();
  const db = getDb();
  const store = createDrizzleTicketStore(db);

  return operatorTransitionForPrincipal(
    principal,
    formData,
    {
      seeker: createSeekerRepo({
        store,
        allocateIdentifier: () =>
          nextIdentifier({ kind: "seeker_ticket", executor: drizzleSequenceExecutor(db) }),
      }),
      employerReq: createEmployerReqRepo({
        store,
        allocateIdentifier: () =>
          nextIdentifier({ kind: "employer_req_ticket", executor: drizzleSequenceExecutor(db) }),
      }),
      match: createMatchRepo({
        store,
        allocateIdentifier: (kind) =>
          nextIdentifier({ kind, executor: drizzleSequenceExecutor(db) }),
      }),
    },
    [OPERATOR_TRANSITION_SCOPE],
  );
}
