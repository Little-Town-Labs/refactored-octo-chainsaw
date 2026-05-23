import { emailChannelCapability } from "../capabilities.js";

describe("email capabilities", () => {
  it("describes async threaded email posture", () => {
    expect(emailChannelCapability.adapter_name).toBe("email-channel");
    expect(emailChannelCapability.acknowledgement_mode).toBe("async");
    expect(emailChannelCapability.retry_mode).toBe("provider_retry");
  });
});
