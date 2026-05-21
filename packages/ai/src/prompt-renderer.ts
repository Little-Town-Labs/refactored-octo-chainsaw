import { canonicalHash } from "./hash.js";
import type { AiOperationRefusal, PromptVersion } from "./types.js";

export interface RenderPromptResult {
  readonly rendered: string;
  readonly rendered_prompt_hash: string;
}

export function renderPrompt(
  prompt: PromptVersion,
  variables: Record<string, unknown>,
): RenderPromptResult | AiOperationRefusal {
  for (const contract of prompt.variable_contract) {
    const value = variables[contract.name];
    if (value === undefined) {
      if (contract.required) return renderRefusal("prompt_variable_missing", contract.name);
      continue;
    }
    if (!matchesType(value, contract.value_type)) {
      return renderRefusal("unsafe_prompt_variable", contract.name);
    }
    if (contract.sentinel_required && typeof value === "string" && !hasSentinelBoundary(value)) {
      return renderRefusal("unsafe_prompt_variable", contract.name);
    }
  }
  for (const variableName of Object.keys(variables)) {
    if (!prompt.variable_contract.some((contract) => contract.name === variableName)) {
      return renderRefusal("prompt_variable_unexpected", variableName);
    }
  }

  let rendered = prompt.template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, stringifyPromptValue(value));
  }
  return { rendered, rendered_prompt_hash: canonicalHash({ prompt: rendered }) };
}

function matchesType(value: unknown, valueType: string): boolean {
  if (valueType === "array") return Array.isArray(value);
  if (valueType === "object") return !!value && typeof value === "object" && !Array.isArray(value);
  return typeof value === valueType;
}

function hasSentinelBoundary(value: string): boolean {
  return value.includes("<SPYGLASS_UNTRUSTED") && value.includes("</SPYGLASS_UNTRUSTED>");
}

function stringifyPromptValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function renderRefusal(
  reason_code: "prompt_variable_missing" | "prompt_variable_unexpected" | "unsafe_prompt_variable",
  variable: string,
): AiOperationRefusal {
  return {
    operation: "render_prompt",
    reason_code,
    message: `Prompt variable "${variable}" failed validation.`,
    refs: { variable },
  };
}
