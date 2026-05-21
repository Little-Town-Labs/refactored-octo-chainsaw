import type { NegotiationContext, ParleySide, SideScoringOutput, SideTurnOutput } from "./types.js";

export interface PromptAssemblyInput {
  readonly run_id: string;
  readonly side: ParleySide;
  readonly principal_view: Record<string, unknown>;
  readonly counterparty_view: Record<string, unknown>;
  readonly prompt_history: readonly { readonly role: string; readonly content: string }[];
}

export function promptAssemblyInputFromContext(context: NegotiationContext): PromptAssemblyInput {
  return {
    run_id: context.run_id,
    side: context.side,
    principal_view: context.principal_view,
    counterparty_view: context.counterparty_view,
    prompt_history: context.prompt_history,
  };
}

export function validateTurnOutput(output: SideTurnOutput): void {
  if (output.message_to_counterparty.length === 0) {
    throw new Error("turn_message_required");
  }
  if (!Array.isArray(output.flag_proposals)) throw new Error("turn_flags_invalid");
}

export function validateScoringOutput(output: SideScoringOutput): void {
  if (output.dimension_scores.length === 0) throw new Error("scoring_dimensions_required");
  if (output.headline_rationale.length === 0) throw new Error("scoring_rationale_required");
}

export class DeterministicSideAgentDriver {
  constructor(
    private readonly turns: Partial<Record<ParleySide, readonly SideTurnOutput[]>>,
    private readonly scores: Record<ParleySide, SideScoringOutput>,
  ) {}

  async turn(input: {
    readonly side: ParleySide;
    readonly round: number;
  }): Promise<SideTurnOutput> {
    const output = this.turns[input.side]?.[input.round - 1] ?? this.turns[input.side]?.at(-1);
    if (!output) throw new Error(`missing deterministic turn:${input.side}:${input.round}`);
    validateTurnOutput(output);
    return output;
  }

  async score(input: { readonly side: ParleySide }): Promise<SideScoringOutput> {
    const output = this.scores[input.side];
    validateScoringOutput(output);
    return output;
  }
}
