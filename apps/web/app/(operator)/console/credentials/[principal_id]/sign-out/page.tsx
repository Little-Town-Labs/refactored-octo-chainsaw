// F02 T060 — Sign-out confirmation page
// (`/operator/console/credentials/[principal_id]/sign-out`).
//
// RSC. Resolves the target principal's tier so the view can render
// the appropriate copy (single-step vs two-operator gate), then
// renders either the form or the "pending approval" success banner.
//
// Authentication is enforced upstream by proxy.ts (operator audience
// + AAL2); we still re-check the operator tier here so an
// unauthorized navigation surfaces the typed deny via error.tsx.
//
// `params` is async in Next 16 — we await it before reading
// principal_id and validate as a UUID; a non-UUID URL segment renders
// `notFound()` rather than reaching SQL.

import { notFound } from "next/navigation";
import type { JSX } from "react";

import { RoleRequiredError } from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { getPrincipal } from "../../../../../../src/auth/get-principal";
import { createDrizzlePrincipalKindLookup } from "../../../../../../src/auth/revoke-all-sessions-repos";
import { signOutAction } from "../../../../../../src/console/sign-out-action";
import { SignOutConfirmationView } from "../../../../../../src/console/sign-out-confirmation-view";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  readonly params: Promise<{ principal_id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function SignOutPage(props: PageProps): Promise<JSX.Element> {
  const principal = await getPrincipal();
  if (principal.kind !== "human" || principal.tier !== "operator") {
    throw new RoleRequiredError(["operator"], principal.kind);
  }

  const { principal_id } = await props.params;
  if (!UUID_RE.test(principal_id)) notFound();

  const raw = await props.searchParams;
  const rawApprovalId = firstString(raw.approval_id)?.trim().toLowerCase();
  const flash = firstString(raw.flash);
  // FOLLOW-UP (B6-close): the pending banner today renders whenever
  // `?flash=pending&approval_id=<uuid>` is in the URL. An operator
  // (who already has AAL2) could craft this manually — the link they
  // share still flows through the orchestrator's guards (self-approval,
  // cross-target replay, expiry) so no real security boundary is
  // crossed, but the banner is decorative truth. Cross-cutting flash
  // hardening (signed cookie or HMAC token) should replace the
  // query-string flash pattern across all B6 surfaces at once.

  const lookup = createDrizzlePrincipalKindLookup(getDb());
  const target = await lookup.lookupTarget(principal_id);
  if (target === null || target.kind !== "human") notFound();

  const hasValidApprovalId = rawApprovalId !== undefined && UUID_RE.test(rawApprovalId);
  const isPendingFlash = flash === "pending" && hasValidApprovalId;
  const approvalIdFromUrl = !isPendingFlash && hasValidApprovalId ? rawApprovalId : undefined;

  const cancelHref = "/operator/console/credentials";
  const secondOperatorHrefBase = `/operator/console/credentials/${principal_id}/sign-out`;

  // tier is `string` at the lookup boundary; the principals table
  // CHECK constraint guarantees one of the four-value enum so the
  // cast is structurally safe.
  const targetTier = target.tier as SignOutTierUnion;

  return (
    <SignOutConfirmationView
      targetPrincipalId={principal_id}
      targetTier={targetTier}
      {...(approvalIdFromUrl !== undefined ? { approvalIdFromUrl } : {})}
      {...(isPendingFlash && rawApprovalId !== undefined
        ? { pendingApprovalId: rawApprovalId }
        : {})}
      secondOperatorHrefBase={secondOperatorHrefBase}
      action={signOutAction}
      cancelHref={cancelHref}
    />
  );
}

type SignOutTierUnion = "seeker" | "employer_admin" | "employer_member" | "operator";
