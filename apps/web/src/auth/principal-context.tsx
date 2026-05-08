"use client";

// F02 T020 — Client-side principal context.
//
// Holds only the PII-safe projection (`principal_id`, `kind`, `tier`)
// per NFR-7. `usePrincipal()` is the canonical client hook; throws
// when called outside a `<PrincipalProvider>` so missing wiring
// surfaces immediately at compile-time-or-first-render.

import { createContext, useContext, type ReactNode } from "react";

export interface ClientPrincipal {
  readonly principal_id: string;
  readonly kind: "human" | "agent" | "service";
  readonly tier: "seeker" | "employer_admin" | "employer_member" | "operator";
}

const PrincipalContext = createContext<ClientPrincipal | null>(null);

export function PrincipalContextProvider({
  value,
  children,
}: {
  value: ClientPrincipal;
  children: ReactNode;
}) {
  return <PrincipalContext.Provider value={value}>{children}</PrincipalContext.Provider>;
}

export function usePrincipal(): ClientPrincipal {
  const value = useContext(PrincipalContext);
  if (value === null) {
    throw new Error(
      "usePrincipal() called outside <PrincipalProvider>. Wrap the route group layout with <PrincipalProvider>.",
    );
  }
  return value;
}
