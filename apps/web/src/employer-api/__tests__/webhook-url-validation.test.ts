import { validateWebhookUrl, redirectPolicyForWebhookEndpoint } from "../webhook-endpoints";

describe("F23 webhook endpoint URL validation", () => {
  it("accepts public HTTPS URLs and requires manual redirect handling", () => {
    expect(validateWebhookUrl("https://hooks.example.com/spyglass").hostname).toBe(
      "hooks.example.com",
    );
    expect(redirectPolicyForWebhookEndpoint()).toBe("manual");
  });

  it.each([
    "http://hooks.example.com/spyglass",
    "https://localhost/spyglass",
    "https://127.0.0.1/spyglass",
    "https://10.0.0.5/spyglass",
    "https://172.16.0.5/spyglass",
    "https://192.168.1.5/spyglass",
    "https://169.254.1.5/spyglass",
    "https://[::1]/spyglass",
    "https://[fd00::1]/spyglass",
    "https://user:pass@hooks.example.com/spyglass",
  ])("rejects unsafe endpoint %s", (url) => {
    expect(() => validateWebhookUrl(url)).toThrow();
  });
});
