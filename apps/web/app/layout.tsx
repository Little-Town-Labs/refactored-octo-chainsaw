// Spyglass root layout — wraps every audience surface in
// `<ClerkProvider>` (Clerk Core 3 / @clerk/nextjs v7).
// Per Constitution §III.1 (WCAG 2.2 AA), the `<html lang>` attribute
// is set. Per the F02 frontend architecture
// (`.specify/specs/02-identity-auth-aaa/contracts/frontend-architecture.md`),
// the root layout intentionally has no audience-aware logic; route
// groups (`(seeker)`, `(employer)`, `(operator)`) layer their own
// gates on top.

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Spyglass",
  description: "Two-sided AI hiring platform for the agentic era",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return document;
  }

  return <ClerkProvider>{document}</ClerkProvider>;
}
