import { webChatCapabilityMetadata, webChatChannelCapability } from "../capabilities.js";

describe("web-chat capabilities", () => {
  it("declares web-chat transport and accessibility posture", () => {
    expect(webChatChannelCapability.channel_kind).toBe("web_chat");
    expect(webChatChannelCapability.supports_threads).toBe(true);
    expect(webChatCapabilityMetadata.accessibility_contract).toContain("keyboard_activation");
    expect(webChatCapabilityMetadata.unauthenticated_prompt_posture).toBe(
      "sign_in_or_resume_prompt_only",
    );
  });
});
