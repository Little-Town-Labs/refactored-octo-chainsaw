"use server";

import { createDrizzleTicketStore, createSourceWorkflowRepo } from "@spyglass/tickets";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../auth/get-principal";
import { type SubmitTicketResult } from "./submit-results";
import { withdrawSeekerIntentForPrincipal } from "./withdraw-seeker-core";

export async function withdrawSeekerIntent(formData: FormData): Promise<SubmitTicketResult> {
  const principal = await getPrincipal();
  const store = createDrizzleTicketStore(getDb());
  return withdrawSeekerIntentForPrincipal(principal, formData, createSourceWorkflowRepo({ store }));
}
