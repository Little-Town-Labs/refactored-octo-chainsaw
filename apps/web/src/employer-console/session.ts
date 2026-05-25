import { requireRole, type HumanPrincipal } from "@spyglass/auth";

import type { EmployerConsoleCapability, EmployerConsoleSession } from "./types";

export class EmployerOrganizationRequiredError extends Error {
  constructor() {
    super("Employer organization required.");
    this.name = "EmployerOrganizationRequiredError";
  }
}

export function employerCapabilities(
  tier: "employer_admin" | "employer_member",
): ReadonlyArray<EmployerConsoleCapability> {
  if (tier === "employer_admin") return ["profile:write", "req:write", "candidate:read"];
  return ["candidate:read"];
}

export function getEmployerConsoleSession(
  principal: HumanPrincipal,
  mode: "read" | "admin" = "read",
): EmployerConsoleSession {
  const allowed =
    mode === "admin"
      ? requireRole(principal, "employer_admin")
      : requireRole(principal, "employer_admin", "employer_member");

  if (!allowed.org_id) throw new EmployerOrganizationRequiredError();
  return {
    principal_id: allowed.principal_id,
    org_id: allowed.org_id,
    tier: allowed.tier as "employer_admin" | "employer_member",
    capabilities: employerCapabilities(allowed.tier as "employer_admin" | "employer_member"),
  };
}

export function canWriteProfile(session: EmployerConsoleSession): boolean {
  return session.capabilities.includes("profile:write");
}

export function canWriteReq(session: EmployerConsoleSession): boolean {
  return session.capabilities.includes("req:write");
}
