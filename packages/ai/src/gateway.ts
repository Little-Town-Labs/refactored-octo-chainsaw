import { canonicalHash } from "./hash.js";
import type { UsageMetadata } from "./types.js";

export interface GatewayRequest {
  readonly rendered_prompt: string;
  readonly provider: string;
  readonly model: string;
}

export interface GatewayResponse {
  readonly content: string;
  readonly response_hash: string;
  readonly usage_metadata: UsageMetadata | null;
}

export interface GatewayAdapter {
  invoke(request: GatewayRequest): Promise<GatewayResponse>;
}

export interface OpenRouterGatewayAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly appUrl?: string;
  readonly appTitle?: string;
  readonly fetchImpl?: typeof fetch;
}

interface OpenRouterUsage {
  readonly prompt_tokens?: unknown;
  readonly completion_tokens?: unknown;
  readonly total_tokens?: unknown;
}

interface OpenRouterChoice {
  readonly message?: {
    readonly content?: unknown;
  };
  readonly text?: unknown;
}

interface OpenRouterResponseBody {
  readonly choices?: unknown;
  readonly usage?: OpenRouterUsage;
}

export class OpenRouterGatewayAdapter implements GatewayAdapter {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly appUrl: string | undefined;
  private readonly appTitle: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenRouterGatewayAdapterOptions = {}) {
    this.apiKey = normalizeApiKey(options.apiKey ?? process.env.OPENROUTER_API_KEY);
    this.baseUrl = trimTrailingSlash(
      options.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    );
    this.appUrl = options.appUrl ?? process.env.OPENROUTER_APP_URL;
    this.appTitle = options.appTitle ?? process.env.OPENROUTER_APP_TITLE;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async invoke(request: GatewayRequest): Promise<GatewayResponse> {
    if (!this.apiKey) {
      throw new Error("OpenRouter gateway requires OPENROUTER_API_KEY");
    }

    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.rendered_prompt }],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter gateway request failed with HTTP ${response.status}`);
    }

    const body = await parseOpenRouterResponse(response);
    const content = extractOpenRouterContent(body);
    const usage_metadata = normalizeOpenRouterUsage(body.usage);

    return {
      content,
      response_hash: canonicalHash({ content }),
      usage_metadata,
    };
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.appUrl) headers["HTTP-Referer"] = this.appUrl;
    if (this.appTitle) headers["X-OpenRouter-Title"] = this.appTitle;

    return headers;
  }
}

export class FakeGatewayAdapter implements GatewayAdapter {
  constructor(private readonly options: { readonly omitUsage?: boolean } = {}) {}

  async invoke(request: GatewayRequest): Promise<GatewayResponse> {
    const content = `fake:${request.provider}/${request.model}:${request.rendered_prompt.length}`;
    return {
      content,
      response_hash: canonicalHash({ content }),
      usage_metadata: this.options.omitUsage
        ? null
        : {
            input_tokens: request.rendered_prompt.length,
            output_tokens: content.length,
            total_tokens: request.rendered_prompt.length + content.length,
            requests: 1,
          },
    };
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeApiKey(value: string | undefined): string | undefined {
  return value?.trim();
}

async function parseOpenRouterResponse(response: Response): Promise<OpenRouterResponseBody> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("OpenRouter gateway returned invalid JSON");
  }

  if (!isRecord(body)) {
    throw new Error("OpenRouter gateway returned an invalid response envelope");
  }

  return body;
}

function extractOpenRouterContent(body: OpenRouterResponseBody): string {
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new Error("OpenRouter gateway response did not include choices");
  }

  const choice = body.choices[0] as OpenRouterChoice;
  const content = choice.message?.content ?? choice.text;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("OpenRouter gateway response did not include assistant content");
  }

  return content;
}

function normalizeOpenRouterUsage(usage: OpenRouterUsage | undefined): UsageMetadata | null {
  if (!usage) return null;
  const input = toFiniteNumber(usage.prompt_tokens);
  const output = toFiniteNumber(usage.completion_tokens);
  const total = toFiniteNumber(usage.total_tokens);

  if (input === undefined || output === undefined || total === undefined) return null;

  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: total,
    requests: 1,
  };
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
