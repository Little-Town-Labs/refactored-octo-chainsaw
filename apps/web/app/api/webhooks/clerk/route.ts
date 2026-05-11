// F02 T022 — Clerk webhook ingress (Next.js route handler).
//
// Inbound webhooks are unauthenticated by Spyglass's
// principal-resolution path — they're authenticated by Svix
// signature verification (FR-22, plan Decision 5). The handler
// imports `withAnonymous` so the principal-coverage CI gate (T011a)
// sees the explicit opt-out marker per FR-36.
//
// **B2 scope.** This handler wires the verify + parse + snapshot
// path. Real DB-backed materialization (Drizzle implementation of
// `PrincipalRepo`) and Inngest-backed audit-event emission land in
// B2 follow-on work. For now the handler returns 204 on a verified
// payload and 4xx on signature / payload failures, so the surface
// is testable against a Clerk dev instance once env keys are
// populated.
//
// Constitution refs: §I.5.1 (cryptographically verifiable origin),
// §I.6 (no rolling our own crypto), §V.3 (mandatory
// /security-review before merge).

import { randomUUID } from "node:crypto";

import {
  ClerkWebhookPayloadError,
  eventToSnapshot,
  parseClerkWebhookEvent,
  processClerkDirective,
  verifyClerkWebhook,
  WebhookSignatureError,
  type AuditEventSink,
  type ClerkSessionRevoker,
  type ClerkWebhookHeaders,
  type PrincipalRepo,
  type SnapshotContext,
} from "@spyglass/auth";
import { getDb } from "@spyglass/db";

import { createConsoleAuditSink } from "../../../../src/auth/audit-sink.js";
import { createClerkSessionRevoker } from "../../../../src/auth/clerk-session-revoker.js";
import { createDrizzlePrincipalRepo } from "../../../../src/auth/principal-repo.js";
import { withAnonymous } from "../../../../src/auth/with-anonymous.js";

// Per the session-start Vercel knowledge update: Fluid Compute's
// default Node.js runtime is preferred over Edge for compatibility.
export const runtime = "nodejs";

/**
 * Build the operator-org allowlist from environment. Operator org
 * IDs are configured via the F01 env manifest (FR-9). Empty set is
 * acceptable for development; production deployments populate it
 * before enabling the operator surface.
 */
function readOperatorOrgIds(env: NodeJS.ProcessEnv): ReadonlySet<string> {
  const raw = env.SPYGLASS_OPERATOR_CLERK_ORG_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

interface HandleArgs {
  readonly rawBody: string;
  readonly headers: ClerkWebhookHeaders;
  readonly signingSecret: string;
  readonly snapshotContext: SnapshotContext;
  readonly repo: PrincipalRepo;
  readonly sink: AuditEventSink;
  readonly sessionRevoker: ClerkSessionRevoker;
}

/**
 * Pure handler — exported for unit tests; the route export below
 * wraps it with the `withAnonymous` marker and reads request state.
 */
export async function handleClerkWebhook(args: HandleArgs): Promise<Response> {
  let verifiedPayload: unknown;
  try {
    verifiedPayload = verifyClerkWebhook({
      rawBody: args.rawBody,
      headers: args.headers,
      signingSecret: args.signingSecret,
    });
  } catch (cause) {
    if (cause instanceof WebhookSignatureError) {
      // 401 with a generic body — never echo the verification reason
      // to the caller (NFR-13). Real reason goes to the audit pipeline
      // once F05 is wired (B2 follow-on).
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    throw cause;
  }

  let event;
  try {
    event = parseClerkWebhookEvent(verifiedPayload);
  } catch (cause) {
    if (cause instanceof ClerkWebhookPayloadError) {
      return new Response(JSON.stringify({ error: "unsupported_event" }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }
    throw cause;
  }

  const directive = eventToSnapshot(event, args.snapshotContext);
  const correlation_id = randomUUID();

  try {
    await processClerkDirective(directive, {
      repo: args.repo,
      sink: args.sink,
      sessionRevoker: args.sessionRevoker,
      now: () => Math.floor(Date.now() / 1000),
      correlationId: () => correlation_id,
    });
  } catch (cause) {
    // Webhook-signature-verified payload that fails downstream
    // processing (DB outage during disablePrincipal, Clerk pagination
    // failure during session revoke). Re-throw so Clerk's retry
    // policy fires, but emit a structured marker first so an outage
    // spanning Clerk's retry budget is searchable rather than mixed
    // into generic 5xx noise (addresses T068/LOW-2).
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        kind: "webhook_processing_failed",
        event_type: event.type,
        correlation_id,
        cause: cause instanceof Error ? cause.message : String(cause),
      }),
    );
    throw cause;
  }

  return new Response(null, { status: 204 });
}

async function postHandler(req: Request): Promise<Response> {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? "";
  const headers: ClerkWebhookHeaders = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  const rawBody = await req.text();
  const snapshotContext: SnapshotContext = {
    operatorClerkOrgIds: readOperatorOrgIds(process.env),
  };
  return handleClerkWebhook({
    rawBody,
    headers,
    signingSecret,
    snapshotContext,
    repo: createDrizzlePrincipalRepo(getDb()),
    sink: createConsoleAuditSink(),
    sessionRevoker: createClerkSessionRevoker(),
  });
}

export const POST = withAnonymous(postHandler, {
  route: "/api/webhooks/clerk",
  reason: "Authenticated by Svix signature verification (FR-22).",
});
