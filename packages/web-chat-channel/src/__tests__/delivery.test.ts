import { mapWebChatDeliveryStatus } from "../delivery.js";
import { fixedNow } from "./fixtures.js";

describe("web-chat delivery status mapping", () => {
  it("maps rendered, displayed, acknowledged, retryable, terminal, expired, cancelled, refused, unsupported, and duplicate statuses", () => {
    const now = () => fixedNow;
    expect(mapWebChatDeliveryStatus({ status: "rendered" }, now).status).toBe("delivered");
    expect(mapWebChatDeliveryStatus({ status: "displayed" }, now).status).toBe("delivered");
    expect(mapWebChatDeliveryStatus({ status: "acknowledged" }, now).status).toBe("delivered");
    expect(mapWebChatDeliveryStatus({ status: "retryable_failure" }, now).status).toBe(
      "retryable_failure",
    );
    expect(mapWebChatDeliveryStatus({ status: "terminal_failure" }, now).status).toBe(
      "terminal_failure",
    );
    expect(mapWebChatDeliveryStatus({ status: "expired" }, now).status).toBe("terminal_failure");
    expect(mapWebChatDeliveryStatus({ status: "cancelled" }, now).status).toBe("terminal_failure");
    expect(mapWebChatDeliveryStatus({ status: "refused" }, now).status).toBe("refused");
    expect(mapWebChatDeliveryStatus({ status: "unsupported" }, now).status).toBe("unsupported");
    expect(mapWebChatDeliveryStatus({ status: "duplicate" }, now).reason_code).toBe(
      "duplicate_suppressed",
    );
  });
});
