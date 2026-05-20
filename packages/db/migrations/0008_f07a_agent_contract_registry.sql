CREATE TABLE "agent_contract_versions" (
	"agent_contract_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"contract_id" text NOT NULL,
	"version" text NOT NULL,
	"side" text NOT NULL,
	"status" text NOT NULL,
	"prompt_template_ref" jsonb NOT NULL,
	"rubric_ref" jsonb NOT NULL,
	"tool_surface_ref" jsonb NOT NULL,
	"model_ref" jsonb NOT NULL,
	"runtime_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extension_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"description" text NOT NULL,
	"author_principal_id" uuid NOT NULL,
	"reviewer_principal_id" uuid,
	"published_at" timestamp with time zone,
	"deprecated_after" timestamp with time zone,
	"audit_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_contract_versions_contract_id_check" CHECK ("agent_contract_versions"."contract_id" <> ''),
	CONSTRAINT "agent_contract_versions_version_check" CHECK ("agent_contract_versions"."version" <> ''),
	CONSTRAINT "agent_contract_versions_side_check" CHECK ("agent_contract_versions"."side" IN ('seeker','employer')),
	CONSTRAINT "agent_contract_versions_status_check" CHECK ("agent_contract_versions"."status" IN ('draft','published','deprecated','retired')),
	CONSTRAINT "agent_contract_versions_content_hash_check" CHECK ("agent_contract_versions"."content_hash" <> ''),
	CONSTRAINT "agent_contract_versions_description_check" CHECK ("agent_contract_versions"."description" <> ''),
	CONSTRAINT "agent_contract_versions_published_shape_check" CHECK ("agent_contract_versions"."status" <> 'published' OR ("agent_contract_versions"."reviewer_principal_id" IS NOT NULL AND "agent_contract_versions"."published_at" IS NOT NULL AND "agent_contract_versions"."audit_event_id" IS NOT NULL)),
	CONSTRAINT "agent_contract_versions_deprecated_shape_check" CHECK ("agent_contract_versions"."status" <> 'deprecated' OR "agent_contract_versions"."deprecated_after" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "agent_contract_events" (
	"agent_contract_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"agent_contract_version_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"reason_code" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"reviewer_principal_id" uuid,
	"correlation_id" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_contract_events_event_type_check" CHECK ("agent_contract_events"."event_type" IN ('published','deprecated')),
	CONSTRAINT "agent_contract_events_reason_code_check" CHECK ("agent_contract_events"."reason_code" IN ('initial_launch','policy_update','rubric_ref_update','prompt_ref_update','tool_surface_update','model_update','runtime_setting_update','compliance_deprecation')),
	CONSTRAINT "agent_contract_events_correlation_id_check" CHECK ("agent_contract_events"."correlation_id" <> '')
);
--> statement-breakpoint
ALTER TABLE "agent_contract_versions" ADD CONSTRAINT "agent_contract_versions_author_principal_id_principals_principal_id_fk" FOREIGN KEY ("author_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_versions" ADD CONSTRAINT "agent_contract_versions_reviewer_principal_id_principals_principal_id_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_versions" ADD CONSTRAINT "agent_contract_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_events" ADD CONSTRAINT "agent_contract_events_agent_contract_version_id_agent_contract_versions_agent_contract_version_id_fk" FOREIGN KEY ("agent_contract_version_id") REFERENCES "public"."agent_contract_versions"("agent_contract_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_events" ADD CONSTRAINT "agent_contract_events_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_events" ADD CONSTRAINT "agent_contract_events_reviewer_principal_id_principals_principal_id_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contract_events" ADD CONSTRAINT "agent_contract_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_contract_versions_ref_unique_idx" ON "agent_contract_versions" USING btree ("contract_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_contract_versions_audit_event_idx" ON "agent_contract_versions" USING btree ("audit_event_id") WHERE "agent_contract_versions"."audit_event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_contract_versions_side_status_idx" ON "agent_contract_versions" USING btree ("side","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "agent_contract_events_contract_idx" ON "agent_contract_events" USING btree ("agent_contract_version_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "agent_contract_events_actor_idx" ON "agent_contract_events" USING btree ("principal_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "agent_contract_events_audit_event_idx" ON "agent_contract_events" USING btree ("audit_event_id");
