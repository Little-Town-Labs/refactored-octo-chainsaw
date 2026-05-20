import { randomUUID } from "node:crypto";

import type { ToolRepository } from "./repo.js";
import type {
  DisclosureClass,
  DisclosureRoute,
  JsonObject,
  ToolDispatchResult,
  VersionedToolRef,
} from "./types.js";

export interface PrivacyFilterPort {
  filterToolOutput(input: {
    readonly run_id: string;
    readonly tool_ref: VersionedToolRef;
    readonly output: JsonObject;
  }): Promise<{ readonly ref: string; readonly output: JsonObject }>;
}

export interface RouteToolOutputInput {
  readonly repository: ToolRepository;
  readonly dispatchEventId: string;
  readonly auditEventId: string;
  readonly runId: string;
  readonly toolRef: VersionedToolRef;
  readonly disclosureClass: DisclosureClass;
  readonly output: JsonObject;
  readonly durationMs: number;
  readonly privacyFilter?: PrivacyFilterPort;
}

export async function routeToolOutput(input: RouteToolOutputInput): Promise<ToolDispatchResult> {
  const base = {
    tool_ref: input.toolRef,
    disclosure_class: input.disclosureClass,
    audit_event_id: input.auditEventId,
    duration_ms: input.durationMs,
    continue_turn: true,
  };
  if (input.disclosureClass === "principal_self") {
    await recordRoute(input, "principal_only", null);
    return {
      ...base,
      status: "ok",
      reason_code: "tool_dispatch_allowed",
      principal_view: input.output,
    };
  }
  if (input.disclosureClass === "platform_open") {
    await recordRoute(input, "platform_open", null);
    return {
      ...base,
      status: "ok",
      reason_code: "tool_dispatch_allowed",
      principal_view: input.output,
    };
  }
  if (!input.privacyFilter) {
    await recordRoute(input, "failed_closed", null);
    return {
      ...base,
      status: "filtered_pending",
      reason_code: "tool_privacy_filter_unavailable",
    };
  }
  const filtered = await input.privacyFilter.filterToolOutput({
    run_id: input.runId,
    tool_ref: input.toolRef,
    output: input.output,
  });
  await recordRoute(input, "privacy_filter_completed", filtered.ref);
  return {
    ...base,
    status: "ok",
    reason_code: "tool_dispatch_allowed",
    counterparty_view_ref: filtered.ref,
  };
}

async function recordRoute(
  input: RouteToolOutputInput,
  route: DisclosureRoute,
  privacyFilterRef: string | null,
): Promise<void> {
  await input.repository.appendDisclosureRoutingEvidence({
    routing_id: randomUUID(),
    dispatch_event_id: input.dispatchEventId,
    disclosure_class: input.disclosureClass,
    route,
    privacy_filter_ref: privacyFilterRef,
    audit_event_id: input.auditEventId,
    created_at: new Date(),
  });
}
