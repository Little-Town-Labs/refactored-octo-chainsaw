export const TOOL_SURFACE_SIDES = ["seeker", "employer", "both"] as const;
export type ToolSurfaceSide = (typeof TOOL_SURFACE_SIDES)[number];

export const TOOL_STATUSES = ["draft", "published", "deprecated"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

export const DISCLOSURE_CLASSES = [
  "principal_self",
  "counterparty_filtered",
  "platform_open",
] as const;
export type DisclosureClass = (typeof DISCLOSURE_CLASSES)[number];

export const TOOL_EVENT_TYPES = [
  "descriptor_published",
  "surface_published",
  "deprecated",
] as const;
export type ToolEventType = (typeof TOOL_EVENT_TYPES)[number];

export const TOOL_EVENT_REASON_CODES = [
  "initial_launch",
  "tool_added",
  "schema_update",
  "adapter_update",
  "compliance_deprecation",
] as const;
export type ToolEventReasonCode = (typeof TOOL_EVENT_REASON_CODES)[number];

export const TOOL_DISPATCH_STATUSES = [
  "ok",
  "tool_unsupported",
  "denied",
  "filtered_pending",
  "adapter_failed",
  "adapter_timeout",
  "schema_invalid",
] as const;
export type ToolDispatchStatus = (typeof TOOL_DISPATCH_STATUSES)[number];

export const TOOL_DISPATCH_REASON_CODES = [
  "tool_dispatch_allowed",
  "tool_surface_missing",
  "tool_surface_unpublished",
  "tool_surface_deprecated",
  "tool_surface_invalid",
  "tool_adapter_unavailable",
  "tool_unsupported",
  "tool_scope_denied",
  "tool_call_limit_exceeded",
  "tool_input_schema_invalid",
  "tool_output_schema_invalid",
  "tool_adapter_failed",
  "tool_adapter_timeout",
  "tool_privacy_filter_required",
  "tool_privacy_filter_unavailable",
  "dispatcher_bypass_detected",
] as const;
export type ToolDispatchReasonCode = (typeof TOOL_DISPATCH_REASON_CODES)[number];

export const DISCLOSURE_ROUTES = [
  "principal_only",
  "privacy_filter_required",
  "privacy_filter_completed",
  "platform_open",
  "failed_closed",
] as const;
export type DisclosureRoute = (typeof DISCLOSURE_ROUTES)[number];

export interface VersionedToolRef {
  readonly name: string;
  readonly version: string;
}

export interface ToolSurfaceRef {
  readonly id: string;
  readonly version: string;
}

export type JsonSchema = Record<string, unknown>;
export type JsonObject = Record<string, unknown>;

export interface ToolDescriptorVersion {
  readonly tool_descriptor_id: string;
  readonly name: string;
  readonly version: string;
  readonly input_schema: JsonSchema;
  readonly output_schema: JsonSchema;
  readonly disclosure_class: DisclosureClass;
  readonly adapter_ref: string;
  readonly status: ToolStatus;
  readonly description: string;
  readonly content_hash: string;
  readonly audit_event_id: string | null;
  readonly published_at: Date | null;
  readonly deprecated_at: Date | null;
  readonly created_at: Date;
}

export type NewToolDescriptorVersion = Omit<
  ToolDescriptorVersion,
  "tool_descriptor_id" | "created_at"
> & {
  readonly tool_descriptor_id?: string;
  readonly created_at?: Date;
};

export interface ToolSurfaceDescriptorRef extends VersionedToolRef {
  readonly required: boolean;
  readonly advertisement_order: number;
}

export interface ToolSurfaceVersion {
  readonly tool_surface_version_id: string;
  readonly surface_id: string;
  readonly version: string;
  readonly side_scope: ToolSurfaceSide;
  readonly status: ToolStatus;
  readonly description: string;
  readonly descriptor_refs: readonly ToolSurfaceDescriptorRef[];
  readonly content_hash: string;
  readonly audit_event_id: string | null;
  readonly published_at: Date | null;
  readonly deprecated_at: Date | null;
  readonly created_at: Date;
}

export type NewToolSurfaceVersion = Omit<
  ToolSurfaceVersion,
  "tool_surface_version_id" | "created_at"
> & {
  readonly tool_surface_version_id?: string;
  readonly created_at?: Date;
};

export interface ToolSurfaceEvent {
  readonly tool_surface_event_id: string;
  readonly subject_kind: "descriptor" | "surface" | "dispatch" | "bypass";
  readonly subject_ref: string;
  readonly event_type: ToolEventType;
  readonly reason_code: ToolEventReasonCode | ToolDispatchReasonCode;
  readonly principal_id: string;
  readonly correlation_id: string;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export type NewToolSurfaceEvent = Omit<ToolSurfaceEvent, "tool_surface_event_id" | "created_at"> & {
  readonly tool_surface_event_id?: string;
  readonly created_at?: Date;
};

export interface ToolAdvertisement {
  readonly run_id: string;
  readonly side: "seeker" | "employer";
  readonly contract_ref: { readonly id: string; readonly version: string };
  readonly surface_ref: ToolSurfaceRef;
  readonly descriptors: readonly ToolDescriptorVersion[];
  readonly resolved_at: Date;
  readonly reason_code?: ToolDispatchReasonCode;
}

export interface ToolDispatchRequest {
  readonly request_id: string;
  readonly run_id: string;
  readonly turn_id: string;
  readonly side: "seeker" | "employer";
  readonly principal_id: string;
  readonly principal_scopes: readonly string[];
  readonly contract_ref: { readonly id: string; readonly version: string };
  readonly surface_ref: ToolSurfaceRef;
  readonly tool_ref: VersionedToolRef;
  readonly input: JsonObject;
  readonly call_index: number;
  readonly max_tool_calls_per_turn: number;
}

export interface ToolDispatchResult {
  readonly status: ToolDispatchStatus;
  readonly reason_code: ToolDispatchReasonCode;
  readonly tool_ref: VersionedToolRef;
  readonly disclosure_class: DisclosureClass;
  readonly principal_view?: JsonObject;
  readonly counterparty_view_ref?: string;
  readonly audit_event_id: string;
  readonly duration_ms: number;
  readonly continue_turn: boolean;
}

export interface DisclosureRoutingEvidence {
  readonly routing_id: string;
  readonly dispatch_event_id: string;
  readonly disclosure_class: DisclosureClass;
  readonly route: DisclosureRoute;
  readonly privacy_filter_ref: string | null;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export type NewDisclosureRoutingEvidence = Omit<
  DisclosureRoutingEvidence,
  "routing_id" | "created_at"
> & {
  readonly routing_id?: string;
  readonly created_at?: Date;
};

export interface ToolDispatchEvent {
  readonly tool_dispatch_event_id: string;
  readonly run_id: string;
  readonly turn_id: string;
  readonly side: "seeker" | "employer";
  readonly surface_id: string;
  readonly surface_version: string;
  readonly tool_name: string;
  readonly tool_version: string;
  readonly status: ToolDispatchStatus;
  readonly reason_code: ToolDispatchReasonCode;
  readonly disclosure_class: DisclosureClass;
  readonly audit_event_id: string;
  readonly correlation_id: string;
  readonly created_at: Date;
}

export type NewToolDispatchEvent = Omit<
  ToolDispatchEvent,
  "tool_dispatch_event_id" | "created_at"
> & {
  readonly tool_dispatch_event_id?: string;
  readonly created_at?: Date;
};

export interface DispatcherBypassFinding {
  readonly finding_id: string;
  readonly source_path: string;
  readonly forbidden_import: string;
  readonly detected_by: string;
  readonly status: "open" | "resolved" | "expected_fixture";
  readonly audit_event_id: string | null;
  readonly created_at: Date;
}

export type NewDispatcherBypassFinding = Omit<
  DispatcherBypassFinding,
  "finding_id" | "created_at"
> & {
  readonly finding_id?: string;
  readonly created_at?: Date;
};
