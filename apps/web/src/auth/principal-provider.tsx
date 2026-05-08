// F02 T020 — `<PrincipalProvider>` (FR-37, frontend-architecture).
//
// Server component that resolves the principal once per request and
// projects a *thin* shape to the client tree. Per NFR-7 (least
// privilege at trust boundaries) and the F02 frontend architecture
// contract, the client only sees `{ principal_id, kind, tier }` —
// never `external_id`, `org_id`, or any PII.

import "server-only";

import type { ReactNode } from "react";

import { getPrincipal } from "./get-principal.js";
import { PrincipalContextProvider, type ClientPrincipal } from "./principal-context.js";

export async function PrincipalProvider({ children }: { children: ReactNode }) {
  const principal = await getPrincipal();
  const projection: ClientPrincipal = {
    principal_id: principal.principal_id,
    kind: principal.kind,
    tier: principal.tier,
  };
  return <PrincipalContextProvider value={projection}>{children}</PrincipalContextProvider>;
}
