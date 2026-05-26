import { revokeWebhookSigningSecret, rotateWebhookSigningSecret } from "../webhook-signing";

describe("F23 webhook signing secret rotation", () => {
  it("keeps the current secret in overlap and activates the next secret", () => {
    const now = new Date("2026-05-25T12:00:00Z");
    const [previous, next] = rotateWebhookSigningSecret(
      {
        key_id: "key_old",
        secret: "old",
        status: "active",
        active_from: new Date("2026-05-24T12:00:00Z"),
        active_until: null,
      },
      { key_id: "key_new", secret: "new" },
      now,
    );

    expect(previous).toMatchObject({ key_id: "key_old", status: "overlap" });
    expect(previous.active_until?.toISOString()).toBe("2026-05-26T12:00:00.000Z");
    expect(next).toMatchObject({ key_id: "key_new", status: "active", active_until: null });
  });

  it("revokes signing secrets immediately", () => {
    const now = new Date("2026-05-25T12:00:00Z");
    expect(
      revokeWebhookSigningSecret(
        {
          key_id: "key_old",
          secret: "old",
          status: "overlap",
          active_from: new Date("2026-05-24T12:00:00Z"),
          active_until: null,
        },
        now,
      ),
    ).toMatchObject({ status: "revoked", active_until: now });
  });
});
