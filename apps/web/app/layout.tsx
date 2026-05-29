// Spyglass root layout — wraps every audience surface in
// `<ClerkProvider>` (Clerk Core 3 / @clerk/nextjs v7).
// Per Constitution §III.1 (WCAG 2.2 AA), the `<html lang>` attribute
// is set. Per the F02 frontend architecture
// (`.specify/specs/02-identity-auth-aaa/contracts/frontend-architecture.md`),
// the root layout intentionally has no audience-aware logic; route
// groups (`(seeker)`, `(employer)`, `(operator)`) layer their own
// gates on top.

import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Spyglass",
  description: "Two-sided AI hiring platform for the agentic era",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="app-auth-header" aria-label="Account">
            <Show when="signed-out">
              <SignInButton />
              <SignUpButton />
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
