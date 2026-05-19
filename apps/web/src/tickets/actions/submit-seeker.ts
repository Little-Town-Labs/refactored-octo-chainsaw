"use server";

import {
  createDrizzleTicketStore,
  createSeekerRepo,
  drizzleSequenceExecutor,
  nextIdentifier,
} from "@spyglass/tickets";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../auth/get-principal";
import { submitSeekerIntentForPrincipal } from "./submit-seeker-core";
import type { SubmitTicketResult } from "./submit-results";

export async function submitSeekerIntent(formData: FormData): Promise<SubmitTicketResult> {
  const principal = await getPrincipal();
  const db = getDb();
  return submitSeekerIntentForPrincipal(
    principal,
    formData,
    createSeekerRepo({
      store: createDrizzleTicketStore(db),
      allocateIdentifier: () =>
        nextIdentifier({
          kind: "seeker_ticket",
          executor: drizzleSequenceExecutor(db),
        }),
    }),
  );
}
