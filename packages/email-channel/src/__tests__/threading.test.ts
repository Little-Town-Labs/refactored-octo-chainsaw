import { boundEmailEvent } from "../normalize.js";
import { buildEmailThreadId, extractReplyAlias, normalizeEmailAddress } from "../threading.js";
import { inboundEmailEvent } from "./fixtures.js";

describe("email threading", () => {
  it("derives reply aliases from Spyglass-issued recipients", () => {
    expect(extractReplyAlias({ to: [{ email: "Spyglass+Reply-ABC@Example.Spyglass.Test" }] })).toBe(
      "spyglass+reply-abc@example.spyglass.test",
    );
  });

  it("normalizes email address casing and unicode form", () => {
    expect(normalizeEmailAddress(" Seeker@Example.COM ")).toBe("seeker@example.com");
  });

  it("builds stable thread ids from reply alias and message references", () => {
    const bounded = boundEmailEvent(inboundEmailEvent());
    if ("reason_code" in bounded) throw new Error(bounded.message);

    expect(buildEmailThreadId(bounded)).toBe("thread-email-spyglass-reply-abc-m-root-example-com");
  });
});
