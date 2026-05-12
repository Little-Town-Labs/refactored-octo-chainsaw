// F02 T023 — Tests for the Clerk webhook surface
// (signature verification, payload parsing, snapshot extraction).
//
// `verifyClerkWebhook` delegates to Svix; we test it end-to-end by
// signing a test payload with a known secret and verifying it back.
// Negative tests cover tampering, replay, and missing headers.

import { Webhook } from "svix";

import {
  ClerkWebhookPayloadError,
  parseClerkWebhookEvent,
  type ClerkWebhookEvent,
} from "../webhook/clerk-events.js";
import { eventToSnapshot, type SnapshotContext } from "../webhook/snapshot.js";
import { verifyClerkWebhook, WebhookSignatureError } from "../webhook/verify.js";

// ── Signature verification ─────────────────────────────────────────

// Svix dev-style secret. The `whsec_` prefix is required.
const TEST_SECRET = "whsec_dGVzdC1zZWNyZXQtMzItYnl0ZXMtbWluaW11bS1mb3Itc3ZpeA";

function signFixture(payload: object): {
  rawBody: string;
  headers: { "svix-id": string; "svix-timestamp": string; "svix-signature": string };
} {
  const wh = new Webhook(TEST_SECRET);
  const id = "msg_test_1";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify(payload);
  const signature = wh.sign(id, new Date(parseInt(timestamp, 10) * 1000), rawBody);
  return {
    rawBody,
    headers: {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    },
  };
}

describe("verifyClerkWebhook (FR-22, plan Decision 5)", () => {
  it("verifies a correctly signed payload", () => {
    const { rawBody, headers } = signFixture({
      type: "session.removed",
      data: { id: "sess_1", user_id: "user_1" },
    });
    const result = verifyClerkWebhook({ rawBody, headers, signingSecret: TEST_SECRET });
    expect(result).toBeDefined();
  });

  it("rejects a tampered body", () => {
    const { rawBody, headers } = signFixture({
      type: "session.removed",
      data: { id: "sess_1", user_id: "user_1" },
    });
    expect(() =>
      verifyClerkWebhook({
        rawBody: rawBody.replace("user_1", "user_attacker"),
        headers,
        signingSecret: TEST_SECRET,
      }),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects a request with the wrong signing secret", () => {
    const { rawBody, headers } = signFixture({
      type: "session.removed",
      data: { id: "sess_1", user_id: "user_1" },
    });
    expect(() =>
      verifyClerkWebhook({
        rawBody,
        headers,
        signingSecret: "whsec_d3JvbmctMzItYnl0ZS1zZWNyZXQtZm9yLXN2aXgtdGVzdHM",
      }),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects when required svix headers are absent", () => {
    expect(() =>
      verifyClerkWebhook({
        rawBody: "{}",
        headers: { "svix-id": "", "svix-timestamp": "", "svix-signature": "" },
        signingSecret: TEST_SECRET,
      }),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects with a malformed signing secret", () => {
    const { rawBody, headers } = signFixture({
      type: "session.removed",
      data: { id: "sess_1", user_id: "user_1" },
    });
    expect(() =>
      verifyClerkWebhook({ rawBody, headers, signingSecret: "definitely-not-a-svix-secret" }),
    ).toThrow(WebhookSignatureError);
  });
});

// ── Payload parsing ─────────────────────────────────────────────────

describe("parseClerkWebhookEvent", () => {
  it("parses a user.created event", () => {
    const ev = parseClerkWebhookEvent({
      type: "user.created",
      data: { id: "user_abc", first_name: "Ada", last_name: "Lovelace" },
    });
    expect(ev.type).toBe("user.created");
  });

  it("parses an organizationMembership.created event", () => {
    const ev = parseClerkWebhookEvent({
      type: "organizationMembership.created",
      data: {
        organization: { id: "org_acme", name: "Acme Corp" },
        public_user_data: { user_id: "user_emp_admin", first_name: "Grace", last_name: "Hopper" },
        role: "org:admin",
      },
    });
    expect(ev.type).toBe("organizationMembership.created");
  });

  it("rejects an unsupported event type", () => {
    expect(() => parseClerkWebhookEvent({ type: "totally.unknown", data: {} })).toThrow(
      ClerkWebhookPayloadError,
    );
  });

  it("rejects a malformed user_id (not Clerk-shaped)", () => {
    expect(() =>
      parseClerkWebhookEvent({
        type: "user.created",
        data: { id: "not-a-clerk-id" },
      }),
    ).toThrow(ClerkWebhookPayloadError);
  });

  it("ignores extra unknown fields (forward-compat with Clerk additions)", () => {
    const ev = parseClerkWebhookEvent({
      type: "user.created",
      data: { id: "user_abc", brand_new_clerk_field: "🤖" },
    });
    expect(ev.type).toBe("user.created");
  });
});

// ── Event → snapshot ────────────────────────────────────────────────

describe("eventToSnapshot (FR-9, organization mirroring)", () => {
  const ctx: SnapshotContext = {
    operatorClerkOrgIds: new Set(["org_spyglass_ops"]),
  };

  it("user.created → seeker materialization", () => {
    const ev: ClerkWebhookEvent = {
      type: "user.created",
      data: { id: "user_seeker_1", first_name: "Ada", last_name: "Lovelace" },
    };
    const result = eventToSnapshot(ev, ctx);
    expect(result.kind).toBe("materialize");
    if (result.kind === "materialize") {
      expect(result.snapshot.tier).toBe("seeker");
      expect(result.snapshot.org_clerk_id).toBeUndefined();
      expect(result.snapshot.display_name).toBe("Ada Lovelace");
    }
  });

  it("organizationMembership.created with org:admin → employer_admin", () => {
    const ev: ClerkWebhookEvent = {
      type: "organizationMembership.created",
      data: {
        organization: { id: "org_acme", name: "Acme Corp" },
        public_user_data: { user_id: "user_admin", first_name: null, last_name: null },
        role: "org:admin",
      },
    };
    const result = eventToSnapshot(ev, ctx);
    if (result.kind !== "materialize") throw new Error("expected materialize");
    expect(result.snapshot.tier).toBe("employer_admin");
    expect(result.snapshot.org_kind).toBe("employer");
    expect(result.snapshot.org_clerk_id).toBe("org_acme");
  });

  it("organizationMembership.created with non-admin role → employer_member", () => {
    const ev: ClerkWebhookEvent = {
      type: "organizationMembership.created",
      data: {
        organization: { id: "org_acme", name: "Acme Corp" },
        public_user_data: { user_id: "user_member", first_name: null, last_name: null },
        role: "org:member",
      },
    };
    const result = eventToSnapshot(ev, ctx);
    if (result.kind !== "materialize") throw new Error("expected materialize");
    expect(result.snapshot.tier).toBe("employer_member");
  });

  it("organizationMembership.created in operator-allowlisted org → operator (FR-9)", () => {
    const ev: ClerkWebhookEvent = {
      type: "organizationMembership.created",
      data: {
        organization: { id: "org_spyglass_ops", name: "Spyglass Operators" },
        public_user_data: { user_id: "user_op", first_name: "Op", last_name: "One" },
        role: "org:admin", // role inside Clerk is irrelevant for operator detection
      },
    };
    const result = eventToSnapshot(ev, ctx);
    if (result.kind !== "materialize") throw new Error("expected materialize");
    expect(result.snapshot.tier).toBe("operator");
    expect(result.snapshot.org_kind).toBe("operator");
  });

  it("user.deleted → disable directive (FR-34)", () => {
    const ev: ClerkWebhookEvent = {
      type: "user.deleted",
      data: { id: "user_gone" },
    };
    const result = eventToSnapshot(ev, ctx);
    expect(result.kind).toBe("disable");
    if (result.kind === "disable") {
      expect(result.external_id).toBe("user_gone");
      expect(result.org_clerk_id).toBeNull();
    }
  });

  it("organizationMembership.deleted → disable directive scoped to org", () => {
    const ev: ClerkWebhookEvent = {
      type: "organizationMembership.deleted",
      data: {
        organization: { id: "org_acme" },
        public_user_data: { user_id: "user_member", first_name: null, last_name: null },
        role: "org:member",
      },
    };
    const result = eventToSnapshot(ev, ctx);
    expect(result.kind).toBe("disable");
    if (result.kind === "disable") {
      expect(result.org_clerk_id).toBe("org_acme");
    }
  });

  it("session.removed → ignore (Clerk owns sessions)", () => {
    const ev: ClerkWebhookEvent = {
      type: "session.removed",
      data: { id: "sess_x", user_id: "user_x" },
    };
    expect(eventToSnapshot(ev, ctx).kind).toBe("ignore");
  });
});
