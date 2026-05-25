import type { ReactNode } from "react";

import { EmployerConsoleLayout } from "../../../../src/employer-console/employer-console-layout";

export default function Layout({ children }: { readonly children: ReactNode }) {
  return <EmployerConsoleLayout>{children}</EmployerConsoleLayout>;
}
