import { notFound } from "next/navigation";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../../src/auth/get-principal";
import { CandidateDetailView } from "../../../../../../src/employer-console/candidate-detail-view";
import { createDrizzleEmployerConsoleReadRepo } from "../../../../../../src/employer-console/repos";
import { getEmployerConsoleSession } from "../../../../../../src/employer-console/session";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EmployerCandidateDetailPage(props: PageProps) {
  const principal = await getPrincipal();
  const session = getEmployerConsoleSession(principal, "read");
  const { id } = await props.params;
  const entry = await createDrizzleEmployerConsoleReadRepo(getDb()).getCandidate(
    session.org_id,
    id,
  );
  if (!entry) notFound();
  return <CandidateDetailView entry={entry} />;
}
