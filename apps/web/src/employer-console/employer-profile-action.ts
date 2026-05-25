"use server";

import { getDb } from "@spyglass/db";
import type { HumanPrincipal } from "@spyglass/auth";

import { getPrincipal } from "../auth/get-principal";
import { parseEmployerProfileInput } from "./parsers";
import { createDrizzleEmployerProfileRepo, type EmployerProfileRepo } from "./profile-repo";
import { getEmployerConsoleSession } from "./session";

export interface EmployerConsoleActionResult {
  readonly status: "success" | "error";
  readonly id?: string;
  readonly identifier?: string;
  readonly state?: string;
  readonly serverError?: string;
  readonly errors?: Record<string, string[]>;
}

export async function saveEmployerProfileForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: EmployerProfileRepo,
): Promise<EmployerConsoleActionResult> {
  let session;
  try {
    session = getEmployerConsoleSession(principal, "admin");
  } catch {
    return { status: "error", serverError: "Profile update is not available.", errors: {} };
  }

  const parsed = parseEmployerProfileInput(formData);
  if (!parsed.ok || !parsed.value) return { status: "error", errors: parsed.errors };
  const row = await repo.upsert(session.org_id, principal, parsed.value);
  return { status: "success", id: row.profile_id };
}

export async function saveEmployerProfile(
  formData: FormData,
): Promise<EmployerConsoleActionResult> {
  const principal = await getPrincipal();
  return saveEmployerProfileForPrincipal(
    principal,
    formData,
    createDrizzleEmployerProfileRepo(getDb()),
  );
}

export async function saveEmployerProfileSubmit(formData: FormData): Promise<void> {
  await saveEmployerProfile(formData);
}
