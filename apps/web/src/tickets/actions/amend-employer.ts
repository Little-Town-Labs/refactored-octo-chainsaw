"use server";

import { createDrizzleTicketStore, createSourceWorkflowRepo } from "@spyglass/tickets";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../auth/get-principal";
import { amendEmployerRequisitionForPrincipal } from "./amend-source-core";
import type { SubmitTicketResult } from "./submit-results";

export async function amendEmployerRequisition(formData: FormData): Promise<SubmitTicketResult> {
  const principal = await getPrincipal();
  const store = createDrizzleTicketStore(getDb());
  return amendEmployerRequisitionForPrincipal(
    principal,
    formData,
    createSourceWorkflowRepo({ store }),
  );
}
