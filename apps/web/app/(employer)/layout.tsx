// Employer route group (PRD §3.2). Clerk Organizations back the
// multi-tenant employer side. Mandatory AAL2 MFA per FR-11/12/13 is
// enforced by proxy.ts; pages still call getPrincipal()/role guards
// defense-in-depth.

import type { ReactNode } from "react";

export default function EmployerLayout({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}
