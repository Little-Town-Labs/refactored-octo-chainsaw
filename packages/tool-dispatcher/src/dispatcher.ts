import { randomUUID } from "node:crypto";

import { appendCanonicalAuditEvent, type CanonicalAuditWriterStore } from "@spyglass/audit-log";

import type { ToolAdapterRegistry } from "./adapter-registry.js";
import { routeToolOutput, type PrivacyFilterPort } from "./disclosure.js";
import type { ToolRepository } from "./repo.js";
import { TOOL_DISPATCH_SCOPE } from "./scopes.js";
import type {
  DisclosureClass,
  ToolAdvertisement,
  ToolDescriptorVersion,
  ToolDispatchReasonCode,
  ToolDispatchRequest,
  ToolDispatchResult,
  ToolDispatchStatus,
} from "./types.js";
import { descriptorKey, validateJsonSchemaPayload } from "./validation.js";

export interface DispatchToolOptions {
  readonly repository: ToolRepository;
  readonly adapters: ToolAdapterRegistry;
  readonly auditStore: CanonicalAuditWriterStore;
  readonly advertisement: ToolAdvertisement;
  readonly request: ToolDispatchRequest;
  readonly privacyFilter?: PrivacyFilterPort;
}

export async function dispatchTool(options: DispatchToolOptions): Promise<ToolDispatchResult> {
  const started = Date.now();
  const descriptor = options.advertisement.descriptors.find(
    (candidate) => descriptorKey(candidate) === descriptorKey(options.request.tool_ref),
  );
  if (!descriptor) {
    return recordNonOk(options, "tool_unsupported", "tool_unsupported", "platform_open", started);
  }
  if (!options.request.principal_scopes.includes(TOOL_DISPATCH_SCOPE)) {
    return recordNonOk(
      options,
      "denied",
      "tool_scope_denied",
      descriptor.disclosure_class,
      started,
    );
  }
  if (options.request.call_index >= options.request.max_tool_calls_per_turn) {
    return recordNonOk(
      options,
      "denied",
      "tool_call_limit_exceeded",
      descriptor.disclosure_class,
      started,
    );
  }
  if (!validateJsonSchemaPayload(descriptor.input_schema, options.request.input)) {
    return recordNonOk(
      options,
      "schema_invalid",
      "tool_input_schema_invalid",
      descriptor.disclosure_class,
      started,
    );
  }
  const adapter = options.adapters.get(descriptor.adapter_ref);
  if (!adapter) {
    return recordNonOk(
      options,
      "denied",
      "tool_adapter_unavailable",
      descriptor.disclosure_class,
      started,
    );
  }
  try {
    const output = await adapter.invoke(options.request.input, {
      run_id: options.request.run_id,
      turn_id: options.request.turn_id,
      side: options.request.side,
      principal_id: options.request.principal_id,
    });
    if (!validateJsonSchemaPayload(descriptor.output_schema, output)) {
      return recordNonOk(
        options,
        "schema_invalid",
        "tool_output_schema_invalid",
        descriptor.disclosure_class,
        started,
      );
    }
    const event = await appendDispatchAudit(options, descriptor, "ok", "tool_dispatch_allowed");
    return routeToolOutput({
      repository: options.repository,
      dispatchEventId: event.dispatchEventId,
      auditEventId: event.auditEventId,
      runId: options.request.run_id,
      toolRef: options.request.tool_ref,
      disclosureClass: descriptor.disclosure_class,
      output,
      durationMs: Date.now() - started,
      ...(options.privacyFilter ? { privacyFilter: options.privacyFilter } : {}),
    });
  } catch {
    return recordNonOk(
      options,
      "adapter_failed",
      "tool_adapter_failed",
      descriptor.disclosure_class,
      started,
    );
  }
}

async function recordNonOk(
  options: DispatchToolOptions,
  status: ToolDispatchStatus,
  reasonCode: ToolDispatchReasonCode,
  disclosureClass: DisclosureClass,
  started: number,
): Promise<ToolDispatchResult> {
  const event = await appendDispatchAudit(options, null, status, reasonCode);
  return {
    status,
    reason_code: reasonCode,
    tool_ref: options.request.tool_ref,
    disclosure_class: disclosureClass,
    audit_event_id: event.auditEventId,
    duration_ms: Date.now() - started,
    continue_turn: status === "tool_unsupported",
  };
}

async function appendDispatchAudit(
  options: DispatchToolOptions,
  descriptor: ToolDescriptorVersion | null,
  status: ToolDispatchStatus,
  reasonCode: ToolDispatchReasonCode,
): Promise<{ readonly dispatchEventId: string; readonly auditEventId: string }> {
  const dispatchEventId = randomUUID();
  const auditEvent = await appendCanonicalAuditEvent(options.auditStore, {
    sourceTable: "tool_dispatch_events",
    sourceEventId: dispatchEventId,
    eventName: status === "ok" ? "tool.dispatch_invoked" : "tool.dispatch_refused",
    principalId: options.request.principal_id,
    principalKind: "agent",
    roleOrScope: TOOL_DISPATCH_SCOPE,
    correlationId: options.request.request_id,
    chainNamespace: "tool-surface-dispatcher",
    payload: {
      run_id: options.request.run_id,
      turn_id: options.request.turn_id,
      surface_ref: options.request.surface_ref,
      tool_ref: options.request.tool_ref,
      status,
      reason_code: reasonCode,
    },
    createdAt: new Date(),
  });
  await options.repository.appendToolDispatchEvent({
    tool_dispatch_event_id: dispatchEventId,
    run_id: options.request.run_id,
    turn_id: options.request.turn_id,
    side: options.request.side,
    surface_id: options.request.surface_ref.id,
    surface_version: options.request.surface_ref.version,
    tool_name: options.request.tool_ref.name,
    tool_version: options.request.tool_ref.version,
    status,
    reason_code: reasonCode,
    disclosure_class: descriptor?.disclosure_class ?? "platform_open",
    audit_event_id: auditEvent.audit_event_id,
    correlation_id: options.request.request_id,
    created_at: new Date(),
  });
  return { dispatchEventId, auditEventId: auditEvent.audit_event_id };
}
