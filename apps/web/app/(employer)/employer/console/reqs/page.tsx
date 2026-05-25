import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../src/auth/get-principal";
import { parsePaginationParams } from "../../../../../src/employer-console/parsers";
import { createDrizzleEmployerConsoleReadRepo } from "../../../../../src/employer-console/repos";
import { ReqListView } from "../../../../../src/employer-console/req-list-view";
import { getEmployerConsoleSession } from "../../../../../src/employer-console/session";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EmployerReqsPage(props: PageProps) {
  const principal = await getPrincipal();
  const session = getEmployerConsoleSession(principal, "read");
  const pagination = parsePaginationParams(await props.searchParams);
  const result = await createDrizzleEmployerConsoleReadRepo(getDb()).listReqs(
    session.org_id,
    pagination,
  );
  return <ReqListView rows={result.rows} next_cursor={result.next_cursor} />;
}
