// Seeker route group (PRD §3.1). Single-user Clerk accounts.
// Per Constitution §III.1, MFA is optional for seekers (FR-14);
// no AAL2 gate at this layer.

import type { ReactNode } from "react";

export default function SeekerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
