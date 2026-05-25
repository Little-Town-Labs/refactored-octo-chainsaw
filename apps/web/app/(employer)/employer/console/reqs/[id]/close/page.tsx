import { notFound } from "next/navigation";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../../../src/auth/get-principal";
import { createDrizzleEmployerConsoleReadRepo } from "../../../../../../../src/employer-console/repos";
import { ReqCloseView } from "../../../../../../../src/employer-console/req-close-view";
import { getEmployerConsoleSession } from "../../../../../../../src/employer-console/session";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EmployerReqClosePage(props: PageProps) {
  const principal = await getPrincipal();
  const session = getEmployerConsoleSession(principal, "admin");
  const { id } = await props.params;
  const req = await createDrizzleEmployerConsoleReadRepo(getDb()).getReq(session.org_id, id);
  if (!req) notFound();
  return <ReqCloseView req={req} />;
}
