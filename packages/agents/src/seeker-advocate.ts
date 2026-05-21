import { invokeModel } from "@spyglass/ai";

import { auditRefsFromRecord } from "./types.js";
import type {
  SeekerAdvocateRefusal,
  SeekerAdvocateRunInput,
  SeekerAdvocateTurnResult,
  SeekerTurnDecision,
} from "./types.js";

const HUMAN_PAUSE_PATTERNS = [
  /ask\s+the\s+seeker/i,
  /wait\s+for\s+human/i,
  /human\s+input/i,
  /pause\s+the\s+run/i,
];

export async function runSeekerAdvocateTurn(
  input: SeekerAdvocateRunInput,
): Promise<SeekerTurnDecision> {
  const boundary = validateSeekerAdvocateInput(input, "turn");
  if (boundary) return { ok: false, refusal: boundary };

  const invocation = await invokeModel(input.runtime.repository, input.runtime.gateway, {
    caller: input.runtime.caller,
    caller_scope: input.runtime.caller_scope,
    run_ref: input.run_id,
    purpose: "seeker_advocate_turn",
    prompt_ref: input.refs.prompt_ref,
    model_ref: input.refs.model_ref,
    manifest_ref: input.refs.manifest_ref,
    variables: {
      candidate_context: buildCandidateContext(input),
    },
  });

  if (!invocation.ok) {
    return {
      ok: false,
      refusal: refusal(
        input,
        "turn",
        mapAiReason(invocation.refusal.reason_code),
        invocation.refusal.message,
        {
          ai_reason_code: invocation.refusal.reason_code,
        },
      ),
    };
  }

  const message = `Seeker perspective: ${invocation.content}`;
  if (HUMAN_PAUSE_PATTERNS.some((pattern) => pattern.test(message))) {
    return {
      ok: false,
      refusal: refusal(
        input,
        "turn",
        "human_input_pause_refused",
        "Seeker advocate output attempted to pause for human input.",
      ),
    };
  }

  const result: SeekerAdvocateTurnResult = {
    run_id: input.run_id,
    side: "seeker",
    round: input.round ?? 1,
    message_to_counterparty: message,
    internal_rationale: "Seeker advocate turn generated from governed F12 invocation.",
    done_signal: false,
    flag_proposals: [],
    invocation_ref: invocation.record.invocation_id,
    frozen_refs: input.refs,
    audit_refs: auditRefsFromRecord(invocation.record),
  };
  return { ok: true, result };
}

export function validateSeekerAdvocateInput(
  input: SeekerAdvocateRunInput,
  operation: "turn" | "score",
): SeekerAdvocateRefusal | null {
  if (
    !input.run_id ||
    !input.match_ticket_id ||
    !input.refs.contract_ref.contract_id ||
    !input.refs.prompt_ref.prompt_id ||
    !input.refs.model_ref.model_profile_id ||
    !input.refs.manifest_ref.manifest_id ||
    !input.refs.rubric_ref.rubric_id ||
    !input.refs.privacy_ruleset_ref.ruleset_id ||
    !input.refs.tool_surface_ref.id
  ) {
    return refusal(
      input,
      operation,
      "missing_required_ref",
      "Seeker advocate requires frozen refs.",
    );
  }
  if (input.context.side !== "seeker") {
    return refusal(
      input,
      operation,
      "invalid_frozen_ref",
      "Seeker advocate requires seeker context.",
    );
  }
  if (input.context.run_id !== input.run_id) {
    return refusal(
      input,
      operation,
      "prior_run_context_refused",
      "Seeker advocate refuses context from another run.",
    );
  }
  if (input.counterparty_projection.filtered !== true) {
    return refusal(
      input,
      operation,
      "unfiltered_counterparty_data",
      "Counterparty data must arrive as a privacy-filtered projection.",
    );
  }
  if (containsRawEmployerConfidential(input.counterparty_projection.payload)) {
    return refusal(
      input,
      operation,
      "unfiltered_counterparty_data",
      "Raw employer-confidential fields are not accepted by the seeker advocate.",
    );
  }
  if (input.allowed_tool_names.some((tool) => tool.includes("ask_principal"))) {
    return refusal(
      input,
      operation,
      "human_input_pause_refused",
      "Human input tools are not allowed in autonomous negotiation runs.",
    );
  }
  return null;
}

export function validateRequestedTool(input: SeekerAdvocateRunInput, toolName: string): void {
  if (!input.allowed_tool_names.includes(toolName)) {
    throw new Error("unsupported_tool");
  }
}

function buildCandidateContext(input: SeekerAdvocateRunInput): string {
  return JSON.stringify({
    seeker: input.principal_view,
    counterparty_projection_ref: input.counterparty_projection.projection_ref,
    counterparty: input.counterparty_projection.payload,
    round: input.round ?? null,
  });
}

function containsRawEmployerConfidential(payload: Record<string, unknown>): boolean {
  return ["raw_employer_confidential", "employer_private_notes", "unfiltered_salary_band"].some(
    (key) => key in payload,
  );
}

export function mapAiReason(reasonCode: string): SeekerAdvocateRefusal["reason_code"] {
  if (reasonCode === "budget_preflight_exceeded") return "budget_preflight_exceeded";
  if (reasonCode === "unsafe_prompt_variable") return "unsafe_prompt_variable";
  if (reasonCode === "gateway_unavailable") return "gateway_unavailable";
  if (reasonCode === "audit_unavailable") return "audit_unavailable";
  return "unauthorized_manifest_ref";
}

export function refusal(
  input: Pick<SeekerAdvocateRunInput, "run_id">,
  operation: "turn" | "score",
  reason_code: SeekerAdvocateRefusal["reason_code"],
  message: string,
  affected_refs?: Record<string, unknown>,
): SeekerAdvocateRefusal {
  const base = {
    run_id: input.run_id || "missing",
    side: "seeker" as const,
    operation,
    reason_code,
    message,
    audit_refs: [],
    created_at: new Date().toISOString(),
  };
  return affected_refs ? { ...base, affected_refs } : base;
}
