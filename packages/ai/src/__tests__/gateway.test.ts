import { FakeGatewayAdapter } from "../gateway.js";

describe("gateway adapter", () => {
  test("fake adapter returns deterministic content and usage metadata", async () => {
    const response = await new FakeGatewayAdapter().invoke({
      rendered_prompt: "hello",
      provider: "openai",
      model: "gpt-5.4-mini",
    });

    expect(response.content).toBe("fake:openai/gpt-5.4-mini:5");
    expect(response.usage_metadata?.total_tokens).toBeGreaterThan(0);
  });
});
