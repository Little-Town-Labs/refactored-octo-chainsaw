"use server";

import {
  createDrizzleTicketStore,
  createEmployerReqRepo,
  drizzleSequenceExecutor,
  nextIdentifier,
} from "@spyglass/tickets";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../auth/get-principal";
import { submitEmployerRequisitionForPrincipal } from "./submit-employer-core";
import type { SubmitTicketResult } from "./submit-results";

export async function submitEmployerRequisition(formData: FormData): Promise<SubmitTicketResult> {
  const principal = await getPrincipal();
  const db = getDb();
  return submitEmployerRequisitionForPrincipal(
    principal,
    formData,
    createEmployerReqRepo({
      store: createDrizzleTicketStore(db),
      allocateIdentifier: () =>
        nextIdentifier({
          kind: "employer_req_ticket",
          executor: drizzleSequenceExecutor(db),
        }),
    }),
  );
}
