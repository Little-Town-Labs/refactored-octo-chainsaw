// Employer route group (PRD §3.2). Clerk Organizations back the
// multi-tenant employer side. Mandatory AAL2 MFA per FR-11/12/13;
// the AAL2 enforcement gate lands in B3 (T029/T030).

import type { ReactNode } from "react";

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
