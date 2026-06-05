import { FakeGatewayAdapter, OpenRouterGatewayAdapter } from "../gateway.js";

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

  test("openrouter adapter sends a chat completion request and normalizes usage", async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: "normalized answer" } }],
        usage: {
          prompt_tokens: 7,
          completion_tokens: 11,
          total_tokens: 18,
        },
      }),
    );

    const response = await new OpenRouterGatewayAdapter({
      apiKey: "sk-or-test",
      baseUrl: "https://openrouter.example/api/v1/",
      appUrl: "https://spyglass.example",
      appTitle: "Spyglass",
      fetchImpl,
    }).invoke({
      rendered_prompt: "hello openrouter",
      provider: "openrouter",
      model: "openai/gpt-5.2",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://openrouter.example/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer sk-or-test",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://spyglass.example",
        "X-OpenRouter-Title": "Spyglass",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [{ role: "user", content: "hello openrouter" }],
        stream: false,
      }),
    });
    expect(response.content).toBe("normalized answer");
    expect(response.usage_metadata).toEqual({
      input_tokens: 7,
      output_tokens: 11,
      total_tokens: 18,
      requests: 1,
    });
    expect(response.response_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("openrouter adapter fails closed when the api key is missing", async () => {
    await expect(
      new OpenRouterGatewayAdapter({ apiKey: "" }).invoke({
        rendered_prompt: "hello",
        provider: "openrouter",
        model: "openai/gpt-5.2",
      }),
    ).rejects.toThrow("OPENROUTER_API_KEY");
  });

  test("openrouter adapter fails closed on provider http errors", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ error: "rate limited" }, { status: 429 }));

    await expect(
      new OpenRouterGatewayAdapter({ apiKey: "sk-or-test", fetchImpl }).invoke({
        rendered_prompt: "hello",
        provider: "openrouter",
        model: "openai/gpt-5.2",
      }),
    ).rejects.toThrow("HTTP 429");
  });

  test("openrouter adapter fails closed on malformed response payloads", async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ choices: [{ message: { content: "" } }] }),
    );

    await expect(
      new OpenRouterGatewayAdapter({ apiKey: "sk-or-test", fetchImpl }).invoke({
        rendered_prompt: "hello",
        provider: "openrouter",
        model: "openai/gpt-5.2",
      }),
    ).rejects.toThrow("assistant content");
  });

  test("openrouter adapter fails closed on invalid json responses", async () => {
    const fetchImpl = jest.fn(async () => new Response("not-json", { status: 200 }));

    await expect(
      new OpenRouterGatewayAdapter({ apiKey: "sk-or-test", fetchImpl }).invoke({
        rendered_prompt: "hello",
        provider: "openrouter",
        model: "openai/gpt-5.2",
      }),
    ).rejects.toThrow("invalid JSON");
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}
