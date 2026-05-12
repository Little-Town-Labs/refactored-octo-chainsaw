// Operator route group (FR-9). Restricted Clerk Organization inside
// the same Clerk instance employers use, hidden sign-in surface.
// Mandatory AAL2 MFA. The audience gate (404 to non-operators per
// FR-9) lands with the proxy in B2 (T018), and AAL2 enforcement
// in B3 (T030). This layer is currently a passthrough.

import type { ReactNode } from "react";

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
