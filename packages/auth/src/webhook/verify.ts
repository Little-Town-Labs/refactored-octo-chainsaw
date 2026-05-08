// F02 T022 — Clerk webhook signature verification (Svix).
//
// Clerk uses Svix to sign every outbound webhook with a per-endpoint
// secret. Verification rejects:
//
//   - missing or malformed signature header,
//   - signature mismatch,
//   - replay outside Svix's tolerance window,
//   - unsigned bodies.
//
// Per Constitution §I.6 (no rolling our own crypto), we delegate to
// the official `svix` library. Our wrapper exists to (a) give us a
// typed, named error class instead of svix's loose throws, and (b)
// keep the verification call shape stable across svix major bumps.

import { Webhook } from "svix";

export class WebhookSignatureError extends Error {
  constructor(reason: string) {
    super(`Webhook signature verification failed: ${reason}`);
    this.name = "WebhookSignatureError";
  }
}

/** The Svix headers Clerk produces on every webhook. */
export interface ClerkWebhookHeaders {
  readonly "svix-id": string;
  readonly "svix-timestamp": string;
  readonly "svix-signature": string;
}

/**
 * Verify a Clerk webhook delivery. Throws `WebhookSignatureError`
 * on any failure; on success returns the parsed JSON object the
 * caller can pass to `parseClerkWebhookEvent`.
 *
 * `rawBody` MUST be the exact bytes Clerk sent — not a re-serialized
 * JSON. Svix verifies the body byte-for-byte against the signature.
 */
export function verifyClerkWebhook(args: {
  rawBody: string;
  headers: ClerkWebhookHeaders;
  signingSecret: string;
}): unknown {
  const { rawBody, headers, signingSecret } = args;

  if (!signingSecret) {
    throw new WebhookSignatureError("missing signing secret");
  }
  if (!headers["svix-id"] || !headers["svix-timestamp"] || !headers["svix-signature"]) {
    throw new WebhookSignatureError("required svix-* headers absent");
  }

  let wh: Webhook;
  try {
    wh = new Webhook(signingSecret);
  } catch {
    // Svix throws a generic Error on malformed secret; surface as
    // our typed error without echoing the secret.
    throw new WebhookSignatureError("malformed signing secret");
  }

  try {
    return wh.verify(rawBody, headers as unknown as Record<string, string>);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "unknown verification failure";
    // The error message is intentionally generic to avoid leaking
    // secret material, but `cause` is preserved for stack traces.
    throw Object.assign(new WebhookSignatureError(reason), { cause });
  }
}
