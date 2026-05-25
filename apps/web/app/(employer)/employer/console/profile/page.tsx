import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../src/auth/get-principal";
import { EmployerProfileView } from "../../../../../src/employer-console/employer-profile-view";
import { createDrizzleEmployerProfileRepo } from "../../../../../src/employer-console/profile-repo";
import { getEmployerConsoleSession } from "../../../../../src/employer-console/session";
import { profileFromRow } from "../../../../../src/employer-console/types";

export default async function EmployerProfilePage() {
  const principal = await getPrincipal();
  const session = getEmployerConsoleSession(principal, "read");
  const repo = createDrizzleEmployerProfileRepo(getDb());
  const profile = profileFromRow(session.org_id, await repo.getByOrg(session.org_id));
  return <EmployerProfileView profile={profile} canEdit={session.tier === "employer_admin"} />;
}
