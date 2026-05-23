import { refusal, type ChannelRefusal } from "@spyglass/channels-core";

import type { WebChatAccessibilityModel, WebChatRenderModel } from "./types.js";

export interface AccessibilityValidationResult {
  readonly ok: boolean;
  readonly checks: readonly string[];
  readonly refusal?: ChannelRefusal;
}

export const buildAccessibilityModel = (input: {
  readonly actions: readonly {
    readonly action_id: string;
    readonly label: string;
    readonly enabled: boolean;
    readonly disabled_reason?: string;
  }[];
  readonly statusAnnouncement?: "none" | "polite" | "assertive";
  readonly errorPosture?: "inline_and_announced" | "refused_before_render" | "none";
}): WebChatAccessibilityModel => {
  const focus_order = input.actions
    .filter((action) => action.enabled)
    .map((action) => action.action_id);
  return {
    focus_order,
    accessible_names: Object.fromEntries(
      input.actions.map((action) => [action.action_id, action.label]),
    ),
    keyboard_activation: Object.fromEntries(
      input.actions.map((action) => [action.action_id, ["enter", "space"] as const]),
    ),
    status_announcement: input.statusAnnouncement ?? "polite",
    reduced_motion_safe: true,
    error_posture: input.errorPosture ?? "none",
  };
};

export const validateWebChatAccessibility = (
  renderModel: WebChatRenderModel,
): AccessibilityValidationResult => {
  const checks: string[] = [];
  if (!renderModel.accessibility.reduced_motion_safe) {
    return fail(checks, "Web-chat render model must be reduced-motion safe");
  }
  checks.push("reduced_motion_safe");

  for (const action of renderModel.actions) {
    const name = renderModel.accessibility.accessible_names[action.action_id];
    if (!name || name.trim().length === 0) {
      return fail(checks, "Interactive web-chat action is missing an accessible name");
    }
    const keys = renderModel.accessibility.keyboard_activation[action.action_id] ?? [];
    if (!keys.includes("enter") || !keys.includes("space")) {
      return fail(checks, "Interactive web-chat action is missing keyboard activation semantics");
    }
    if (!action.enabled && !action.disabled_reason) {
      return fail(checks, "Disabled web-chat action requires a disabled reason");
    }
  }
  checks.push("interactive_elements");

  if (!["none", "polite", "assertive"].includes(renderModel.accessibility.status_announcement)) {
    return fail(checks, "Web-chat status announcement posture is invalid");
  }
  checks.push("status_announcement");

  return { ok: true, checks };
};

const fail = (checks: readonly string[], message: string): AccessibilityValidationResult => ({
  ok: false,
  checks,
  refusal: refusal("malformed_payload", message),
});
