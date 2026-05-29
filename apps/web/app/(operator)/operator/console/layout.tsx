// F02 T056 — Operator console layout.
//
// Owns the WCAG 2.2 AA scaffolding for every page under
// `/operator/console/*`: skip-link, navigation landmark, and main
// landmark with a stable id (`#main`) the skip-link targets.
//
// Authorization is NOT done here — `proxy.ts` (T018/T030/T034)
// already gates the entire `(operator)` route group on the operator
// audience + AAL2. This layer is a presentation skeleton.

import Link from "next/link";
import type { ReactNode } from "react";

export default function OperatorConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>
      <nav aria-label="Operator console">
        <Link href="/operator/console/credentials">Credentials</Link>{" "}
        <Link href="/operator/console/audit">Audit</Link>
      </nav>
      <main id="main">{children}</main>
    </>
  );
}
