import type {
  NegotiationContext,
  ParleySide,
  ProjectedCounterpartyView,
  PromptMessage,
} from "./types.js";

export class NegotiationContextManager {
  private readonly contexts = new Map<string, NegotiationContext>();
  readonly releaseEvents: {
    readonly run_id: string;
    readonly side: ParleySide;
    readonly reason: string;
  }[] = [];

  initialize(input: {
    readonly run_id: string;
    readonly side: ParleySide;
    readonly principal_view: Record<string, unknown>;
    readonly counterparty_view?: Record<string, unknown>;
    readonly rubric_dimensions: readonly string[];
    readonly system_prompt?: string;
  }): NegotiationContext {
    const context: NegotiationContext = {
      run_id: input.run_id,
      side: input.side,
      principal_view: input.principal_view,
      counterparty_view: input.counterparty_view ?? {},
      prompt_history: input.system_prompt ? [{ role: "system", content: input.system_prompt }] : [],
      tool_call_log: [],
      rubric_scratch: Object.fromEntries(
        input.rubric_dimensions.map((dimension) => [dimension, { score: null, rationale: null }]),
      ),
      projection_refs: [],
      released: false,
    };
    this.contexts.set(contextKey(input.run_id, input.side), context);
    return context;
  }

  get(runId: string, side: ParleySide): NegotiationContext {
    const context = this.contexts.get(contextKey(runId, side));
    if (!context) throw new Error(`negotiation_context_missing:${runId}:${side}`);
    if (context.released) throw new Error(`negotiation_context_released:${runId}:${side}`);
    return context;
  }

  appendPromptMessage(runId: string, side: ParleySide, message: PromptMessage): NegotiationContext {
    const context = this.get(runId, side);
    return this.replace({
      ...context,
      prompt_history: [...context.prompt_history, message],
    });
  }

  updateCounterpartyView(
    runId: string,
    side: ParleySide,
    projection: ProjectedCounterpartyView,
  ): NegotiationContext {
    if (!projection.projection_ref) throw new Error("counterparty_projection_ref_required");
    const context = this.get(runId, side);
    return this.replace({
      ...context,
      counterparty_view: { ...context.counterparty_view, ...projection.payload },
      projection_refs: [...context.projection_refs, projection.projection_ref],
    });
  }

  releaseRun(runId: string, reason: string): void {
    for (const [key, context] of this.contexts.entries()) {
      if (context.run_id !== runId || context.released) continue;
      this.contexts.set(key, { ...context, released: true });
      this.releaseEvents.push({ run_id: runId, side: context.side, reason });
    }
  }

  hasReadableContext(runId: string, side: ParleySide): boolean {
    const context = this.contexts.get(contextKey(runId, side));
    return Boolean(context && !context.released);
  }

  private replace(context: NegotiationContext): NegotiationContext {
    this.contexts.set(contextKey(context.run_id, context.side), context);
    return context;
  }
}

export function contextKey(runId: string, side: ParleySide): string {
  return `${runId}:${side}`;
}
