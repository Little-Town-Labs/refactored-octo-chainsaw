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
