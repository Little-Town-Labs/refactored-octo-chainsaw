import { invokeModel } from "@spyglass/ai";

import { auditRefsFromRecord } from "./types.js";
import type {
  EmployerAdvocateRefusal,
  EmployerAdvocateRunInput,
  EmployerAdvocateTurnResult,
  EmployerTurnDecision,
} from "./types.js";

const HUMAN_PAUSE_PATTERNS = [
  /ask\s+the\s+employer/i,
  /ask\s+the\s+seeker/i,
  /wait\s+for\s+human/i,
  /human\s+input/i,
  /pause\s+the\s+run/i,
];

const DECISION_CONTENT_PATTERNS = [
  /\bhire\b/i,
  /\breject\b/i,
  /no[-\s]?hire/i,
  /threshold\s+(cleared|failed|decision)/i,
];

export async function runEmployerAdvocateTurn(
  input: EmployerAdvocateRunInput,
): Promise<EmployerTurnDecision> {
  const boundary = validateEmployerAdvocateInput(input, "turn");
  if (boundary) return { ok: false, refusal: boundary };

  const invocation = await invokeModel(input.runtime.repository, input.runtime.gateway, {
    caller: input.runtime.caller,
    caller_scope: input.runtime.caller_scope,
    run_ref: input.run_id,
    purpose: "employer_advocate_turn",
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
      refusal: employerRefusal(
        input,
        "turn",
        mapEmployerAiReason(invocation.refusal.reason_code),
        invocation.refusal.message,
        { ai_reason_code: invocation.refusal.reason_code },
      ),
    };
  }

  const message = `Employer perspective: ${invocation.content}`;
  const semanticRefusal = validateEmployerOutputSemantics(input, "turn", message);
  if (semanticRefusal) return { ok: false, refusal: semanticRefusal };

  const result: EmployerAdvocateTurnResult = {
    run_id: input.run_id,
    side: "employer",
    round: input.round ?? 1,
    message_to_counterparty: message,
    internal_rationale: "Employer advocate turn generated from governed F12 invocation.",
    done_signal: false,
    flag_proposals: [],
    invocation_ref: invocation.record.invocation_id,
    frozen_refs: input.refs,
    audit_refs: auditRefsFromRecord(invocation.record),
  };
  return { ok: true, result };
}

export function validateEmployerAdvocateInput(
  input: EmployerAdvocateRunInput,
  operation: "turn" | "score",
): EmployerAdvocateRefusal | null {
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
    return employerRefusal(
      input,
      operation,
      "missing_required_ref",
      "Employer advocate requires frozen refs.",
    );
  }
  if (input.context.side !== "employer") {
    return employerRefusal(
      input,
      operation,
      "invalid_frozen_ref",
      "Employer advocate requires employer context.",
    );
  }
  if (input.context.run_id !== input.run_id) {
    return employerRefusal(
      input,
      operation,
      "prior_run_context_refused",
      "Employer advocate refuses context from another run.",
    );
  }
  if (input.counterparty_projection.filtered !== true) {
    return employerRefusal(
      input,
      operation,
      "unfiltered_counterparty_data",
      "Counterparty data must arrive as a privacy-filtered projection.",
    );
  }
  if (containsRawSeekerData(input.counterparty_projection.payload)) {
    return employerRefusal(
      input,
      operation,
      "unfiltered_counterparty_data",
      "Raw seeker fields are not accepted by the employer advocate.",
    );
  }
  if (containsProtectedClassContent(input.counterparty_projection.payload)) {
    return employerRefusal(
      input,
      operation,
      "protected_class_boundary_refused",
      "Protected-class inference fields are not accepted by the employer advocate.",
    );
  }
  if (input.allowed_tool_names.some((tool) => tool.includes("ask_principal"))) {
    return employerRefusal(
      input,
      operation,
      "human_input_pause_refused",
      "Human input tools are not allowed in autonomous negotiation runs.",
    );
  }
  return null;
}

export function validateEmployerRequestedTool(
  input: EmployerAdvocateRunInput,
  toolName: string,
): void {
  if (!input.allowed_tool_names.includes(toolName)) {
    throw new Error("unsupported_tool");
  }
}

export function validateEmployerOutputSemantics(
  input: Pick<EmployerAdvocateRunInput, "run_id">,
  operation: "turn" | "score",
  text: string,
): EmployerAdvocateRefusal | null {
  if (HUMAN_PAUSE_PATTERNS.some((pattern) => pattern.test(text))) {
    return employerRefusal(
      input,
      operation,
      "human_input_pause_refused",
      "Employer advocate output attempted to pause for human input.",
    );
  }
  if (containsProtectedClassText(text)) {
    return employerRefusal(
      input,
      operation,
      "protected_class_boundary_refused",
      "Employer advocate output attempted protected-class reasoning.",
    );
  }
  if (DECISION_CONTENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return employerRefusal(
      input,
      operation,
      "decision_content_refused",
      "Employer advocate output attempted a hiring or threshold decision.",
    );
  }
  return null;
}

function buildCandidateContext(input: EmployerAdvocateRunInput): string {
  return JSON.stringify({
    employer: input.principal_view,
    counterparty_projection_ref: input.counterparty_projection.projection_ref,
    counterparty: input.counterparty_projection.payload,
    round: input.round ?? null,
  });
}

function containsRawSeekerData(payload: Record<string, unknown>): boolean {
  return [
    "raw_seeker_profile",
    "raw_seeker_pii",
    "unfiltered_resume",
    "demographic_data",
    "consented_bias_audit_data",
  ].some((key) => key in payload);
}

function containsProtectedClassContent(payload: Record<string, unknown>): boolean {
  return ["protected_class", "protected_class_inference", "age", "race", "religion"].some(
    (key) => key in payload,
  );
}

function containsProtectedClassText(text: string): boolean {
  return /protected[-\s]?class|race|religion|pregnancy|disability|age\s+as\s+a\s+factor/i.test(
    text,
  );
}

export function mapEmployerAiReason(reasonCode: string): EmployerAdvocateRefusal["reason_code"] {
  if (reasonCode === "budget_preflight_exceeded") return "budget_preflight_exceeded";
  if (reasonCode === "unsafe_prompt_variable") return "unsafe_prompt_variable";
  if (reasonCode === "gateway_unavailable") return "gateway_unavailable";
  if (reasonCode === "audit_unavailable") return "audit_unavailable";
  return "unauthorized_manifest_ref";
}

export function employerRefusal(
  input: Pick<EmployerAdvocateRunInput, "run_id">,
  operation: "turn" | "score",
  reason_code: EmployerAdvocateRefusal["reason_code"],
  message: string,
  affected_refs?: Record<string, unknown>,
): EmployerAdvocateRefusal {
  const base = {
    run_id: input.run_id || "missing",
    side: "employer" as const,
    operation,
    reason_code,
    message,
    audit_refs: [],
    created_at: new Date().toISOString(),
  };
  return affected_refs ? { ...base, affected_refs } : base;
}
