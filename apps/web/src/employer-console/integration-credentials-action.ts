"use server";

import type { HumanPrincipal } from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import {
  EMPLOYER_API_SCOPES,
  issueEmployerApiCredential,
  type EmployerApiCredentialRepo,
} from "../employer-api/auth";
import type { EmployerApiScope } from "../employer-api/schemas";
import { DrizzleEmployerApiCredentialRepo } from "../employer-api/repos";
import { getPrincipal } from "../auth/get-principal";
import { getEmployerConsoleSession } from "./session";
import type { EmployerConsoleActionResult } from "./employer-profile-action";

export interface IssueIntegrationCredentialResult extends EmployerConsoleActionResult {
  readonly secret?: string;
}

export async function issueIntegrationCredentialForPrincipal(
  principal: HumanPrincipal,
  formData: FormData,
  repo: EmployerApiCredentialRepo,
): Promise<IssueIntegrationCredentialResult> {
  let session;
  try {
    session = getEmployerConsoleSession(principal, "admin");
  } catch {
    return {
      status: "error",
      serverError: "Integration credentials are not available.",
      errors: {},
    };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) {
    return { status: "error", errors: { display_name: ["Display name is required."] } };
  }

  const scopes = parseScopes(formData);
  if (scopes.length === 0) {
    return { status: "error", errors: { scopes: ["Select at least one scope."] } };
  }

  const issued = await issueEmployerApiCredential(repo, {
    org_id: session.org_id,
    principal_id: principal.principal_id,
    display_name: displayName,
    scopes,
    expires_at: null,
  });

  return {
    status: "success",
    id: issued.credential.credential_id,
    secret: issued.secret,
  };
}

export async function issueIntegrationCredential(
  formData: FormData,
): Promise<IssueIntegrationCredentialResult> {
  return issueIntegrationCredentialForPrincipal(
    await getPrincipal(),
    formData,
    new DrizzleEmployerApiCredentialRepo(getDb()),
  );
}

export async function issueIntegrationCredentialSubmit(formData: FormData): Promise<void> {
  await issueIntegrationCredential(formData);
}

function parseScopes(formData: FormData): EmployerApiScope[] {
  const allowed = new Set<string>(Object.values(EMPLOYER_API_SCOPES));
  return formData
    .getAll("scopes")
    .map((scope) => String(scope))
    .filter((scope): scope is EmployerApiScope => allowed.has(scope));
}
