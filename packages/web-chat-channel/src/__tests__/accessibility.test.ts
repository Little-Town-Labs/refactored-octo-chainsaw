import { validateWebChatAccessibility } from "../accessibility.js";
import { renderWebChatOutbound } from "../render.js";
import { richOutboundMessage } from "./fixtures.js";

describe("web-chat accessibility contract", () => {
  it("validates labels, keyboard activation, focus order, disabled controls, announcements, and reduced-motion posture", () => {
    const rendered = renderWebChatOutbound(richOutboundMessage());
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) throw new Error(rendered.refusal.message);

    const validation = validateWebChatAccessibility(rendered.native_payload);
    expect(validation.ok).toBe(true);
    expect(validation.checks).toEqual([
      "reduced_motion_safe",
      "interactive_elements",
      "status_announcement",
    ]);
  });
});
