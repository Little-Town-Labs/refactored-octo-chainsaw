import Link from "next/link";
import type { JSX, ReactNode } from "react";

export function EmployerConsoleLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>
      <nav aria-label="Employer console">
        <Link href="/employer/console/profile">Profile</Link>{" "}
        <Link href="/employer/console/reqs">Reqs</Link>{" "}
        <Link href="/employer/console/candidates">Candidates</Link>{" "}
        <Link href="/employer/console/integrations">Integrations</Link>
      </nav>
      <main id="main">{children}</main>
    </>
  );
}
