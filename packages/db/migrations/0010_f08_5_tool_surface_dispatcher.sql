CREATE TABLE "tool_descriptor_versions" (
	"tool_descriptor_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb NOT NULL,
	"disclosure_class" text NOT NULL,
	"adapter_ref" text NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"content_hash" text NOT NULL,
	"audit_event_id" uuid,
	"published_at" timestamp with time zone,
	"deprecated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_descriptor_versions_name_check" CHECK ("tool_descriptor_versions"."name" <> ''),
	CONSTRAINT "tool_descriptor_versions_version_check" CHECK ("tool_descriptor_versions"."version" <> ''),
	CONSTRAINT "tool_descriptor_versions_disclosure_check" CHECK ("tool_descriptor_versions"."disclosure_class" IN ('principal_self','counterparty_filtered','platform_open')),
	CONSTRAINT "tool_descriptor_versions_adapter_ref_check" CHECK ("tool_descriptor_versions"."adapter_ref" <> ''),
	CONSTRAINT "tool_descriptor_versions_status_check" CHECK ("tool_descriptor_versions"."status" IN ('draft','published','deprecated')),
	CONSTRAINT "tool_descriptor_versions_hash_check" CHECK ("tool_descriptor_versions"."content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "tool_surface_versions" (
	"tool_surface_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"surface_id" text NOT NULL,
	"version" text NOT NULL,
	"side_scope" text NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"descriptor_refs" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"audit_event_id" uuid,
	"published_at" timestamp with time zone,
	"deprecated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_surface_versions_surface_id_check" CHECK ("tool_surface_versions"."surface_id" <> ''),
	CONSTRAINT "tool_surface_versions_version_check" CHECK ("tool_surface_versions"."version" <> ''),
	CONSTRAINT "tool_surface_versions_side_check" CHECK ("tool_surface_versions"."side_scope" IN ('seeker','employer','both')),
	CONSTRAINT "tool_surface_versions_status_check" CHECK ("tool_surface_versions"."status" IN ('draft','published','deprecated')),
	CONSTRAINT "tool_surface_versions_descriptors_check" CHECK (jsonb_array_length("tool_surface_versions"."descriptor_refs") > 0),
	CONSTRAINT "tool_surface_versions_hash_check" CHECK ("tool_surface_versions"."content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "tool_surface_events" (
	"tool_surface_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_ref" text NOT NULL,
	"event_type" text NOT NULL,
	"reason_code" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_surface_events_subject_ref_check" CHECK ("tool_surface_events"."subject_ref" <> ''),
	CONSTRAINT "tool_surface_events_reason_code_check" CHECK ("tool_surface_events"."reason_code" <> ''),
	CONSTRAINT "tool_surface_events_correlation_id_check" CHECK ("tool_surface_events"."correlation_id" <> '')
);
--> statement-breakpoint
CREATE TABLE "tool_dispatch_events" (
	"tool_dispatch_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"run_id" text NOT NULL,
	"turn_id" text NOT NULL,
	"side" text NOT NULL,
	"surface_id" text NOT NULL,
	"surface_version" text NOT NULL,
	"tool_name" text NOT NULL,
	"tool_version" text NOT NULL,
	"status" text NOT NULL,
	"reason_code" text NOT NULL,
	"disclosure_class" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_dispatch_events_run_id_check" CHECK ("tool_dispatch_events"."run_id" <> ''),
	CONSTRAINT "tool_dispatch_events_status_check" CHECK ("tool_dispatch_events"."status" IN ('ok','tool_unsupported','denied','filtered_pending','adapter_failed','adapter_timeout','schema_invalid')),
	CONSTRAINT "tool_dispatch_events_reason_code_check" CHECK ("tool_dispatch_events"."reason_code" <> '')
);
--> statement-breakpoint
CREATE TABLE "disclosure_routing_evidence" (
	"routing_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dispatch_event_id" uuid NOT NULL,
	"disclosure_class" text NOT NULL,
	"route" text NOT NULL,
	"privacy_filter_ref" text,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatcher_bypass_findings" (
	"finding_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"source_path" text NOT NULL,
	"forbidden_import" text NOT NULL,
	"detected_by" text NOT NULL,
	"status" text NOT NULL,
	"audit_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tool_descriptor_versions" ADD CONSTRAINT "tool_descriptor_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_surface_versions" ADD CONSTRAINT "tool_surface_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_surface_events" ADD CONSTRAINT "tool_surface_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tool_dispatch_events" ADD CONSTRAINT "tool_dispatch_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "disclosure_routing_evidence" ADD CONSTRAINT "disclosure_routing_evidence_dispatch_event_id_tool_dispatch_events_tool_dispatch_event_id_fk" FOREIGN KEY ("dispatch_event_id") REFERENCES "public"."tool_dispatch_events"("tool_dispatch_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "disclosure_routing_evidence" ADD CONSTRAINT "disclosure_routing_evidence_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dispatcher_bypass_findings" ADD CONSTRAINT "dispatcher_bypass_findings_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "tool_descriptor_versions_ref_unique_idx" ON "tool_descriptor_versions" USING btree ("name","version");
--> statement-breakpoint
CREATE INDEX "tool_descriptor_versions_status_idx" ON "tool_descriptor_versions" USING btree ("status","created_at" DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX "tool_surface_versions_ref_unique_idx" ON "tool_surface_versions" USING btree ("surface_id","version");
--> statement-breakpoint
CREATE INDEX "tool_surface_versions_status_idx" ON "tool_surface_versions" USING btree ("status","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "tool_surface_events_subject_idx" ON "tool_surface_events" USING btree ("subject_kind","subject_ref","created_at" DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX "tool_surface_events_audit_event_idx" ON "tool_surface_events" USING btree ("audit_event_id");
--> statement-breakpoint
CREATE INDEX "tool_dispatch_events_run_idx" ON "tool_dispatch_events" USING btree ("run_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "tool_dispatch_events_reason_idx" ON "tool_dispatch_events" USING btree ("reason_code","created_at" DESC);
