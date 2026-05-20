CREATE TABLE "rubric_versions" (
	"rubric_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"rubric_id" text NOT NULL,
	"version" text NOT NULL,
	"side" text NOT NULL,
	"status" text NOT NULL,
	"dimensions" jsonb NOT NULL,
	"aggregation_policy" jsonb NOT NULL,
	"bias_test_ref" jsonb,
	"content_hash" text NOT NULL,
	"description" text NOT NULL,
	"author_principal_id" uuid NOT NULL,
	"reviewer_principal_id" uuid,
	"published_at" timestamp with time zone,
	"deprecated_after" timestamp with time zone,
	"audit_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rubric_versions_rubric_id_check" CHECK ("rubric_versions"."rubric_id" <> ''),
	CONSTRAINT "rubric_versions_version_check" CHECK ("rubric_versions"."version" <> ''),
	CONSTRAINT "rubric_versions_side_check" CHECK ("rubric_versions"."side" IN ('seeker','employer','both')),
	CONSTRAINT "rubric_versions_status_check" CHECK ("rubric_versions"."status" IN ('draft','published','deprecated','retired')),
	CONSTRAINT "rubric_versions_dimensions_check" CHECK (jsonb_array_length("rubric_versions"."dimensions") > 0),
	CONSTRAINT "rubric_versions_content_hash_check" CHECK ("rubric_versions"."content_hash" <> ''),
	CONSTRAINT "rubric_versions_description_check" CHECK ("rubric_versions"."description" <> ''),
	CONSTRAINT "rubric_versions_published_shape_check" CHECK ("rubric_versions"."status" <> 'published' OR ("rubric_versions"."reviewer_principal_id" IS NOT NULL AND "rubric_versions"."published_at" IS NOT NULL AND "rubric_versions"."audit_event_id" IS NOT NULL AND "rubric_versions"."bias_test_ref" IS NOT NULL)),
	CONSTRAINT "rubric_versions_deprecated_shape_check" CHECK ("rubric_versions"."status" <> 'deprecated' OR "rubric_versions"."deprecated_after" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "bias_test_artifacts" (
	"bias_test_artifact_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"rubric_id" text NOT NULL,
	"rubric_version" text NOT NULL,
	"rubric_content_hash" text NOT NULL,
	"methodology_ref" jsonb NOT NULL,
	"status" text NOT NULL,
	"jurisdiction_coverage" jsonb NOT NULL,
	"reviewer_principal_id" uuid,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"artifact_uri" text,
	"audit_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bias_test_artifacts_rubric_id_check" CHECK ("bias_test_artifacts"."rubric_id" <> ''),
	CONSTRAINT "bias_test_artifacts_rubric_version_check" CHECK ("bias_test_artifacts"."rubric_version" <> ''),
	CONSTRAINT "bias_test_artifacts_hash_check" CHECK ("bias_test_artifacts"."rubric_content_hash" <> ''),
	CONSTRAINT "bias_test_artifacts_status_check" CHECK ("bias_test_artifacts"."status" IN ('draft','completed','rejected','superseded','expired')),
	CONSTRAINT "bias_test_artifacts_coverage_check" CHECK (jsonb_array_length("bias_test_artifacts"."jurisdiction_coverage") > 0),
	CONSTRAINT "bias_test_artifacts_completed_shape_check" CHECK ("bias_test_artifacts"."status" <> 'completed' OR ("bias_test_artifacts"."reviewer_principal_id" IS NOT NULL AND "bias_test_artifacts"."completed_at" IS NOT NULL AND "bias_test_artifacts"."artifact_uri" IS NOT NULL AND "bias_test_artifacts"."audit_event_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "rubric_events" (
	"rubric_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"rubric_version_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"reason_code" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"reviewer_principal_id" uuid,
	"correlation_id" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rubric_events_event_type_check" CHECK ("rubric_events"."event_type" IN ('published','deprecated')),
	CONSTRAINT "rubric_events_reason_code_check" CHECK ("rubric_events"."reason_code" IN ('initial_launch','policy_update','bias_methodology_update','dimension_update','weight_update','compliance_deprecation')),
	CONSTRAINT "rubric_events_correlation_id_check" CHECK ("rubric_events"."correlation_id" <> '')
);
--> statement-breakpoint
CREATE TABLE "rubric_dispatch_gate_events" (
	"gate_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"rubric_id" text NOT NULL,
	"rubric_version" text NOT NULL,
	"decision" text NOT NULL,
	"reason_code" text NOT NULL,
	"bias_test_artifact_id" uuid,
	"audit_event_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rubric_dispatch_gate_events_rubric_id_check" CHECK ("rubric_dispatch_gate_events"."rubric_id" <> ''),
	CONSTRAINT "rubric_dispatch_gate_events_version_check" CHECK ("rubric_dispatch_gate_events"."rubric_version" <> ''),
	CONSTRAINT "rubric_dispatch_gate_events_decision_check" CHECK ("rubric_dispatch_gate_events"."decision" IN ('allow','deny')),
	CONSTRAINT "rubric_dispatch_gate_events_reason_code_check" CHECK ("rubric_dispatch_gate_events"."reason_code" IN ('rubric_gate_allowed','rubric_missing','rubric_unpublished','rubric_deprecated','rubric_invalid','rubric_missing_bias_test','rubric_bias_test_incomplete','rubric_bias_test_mismatched_hash','rubric_bias_test_expired','rubric_bias_test_insufficient_coverage')),
	CONSTRAINT "rubric_dispatch_gate_events_correlation_id_check" CHECK ("rubric_dispatch_gate_events"."correlation_id" <> '')
);
--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD CONSTRAINT "rubric_versions_author_principal_id_principals_principal_id_fk" FOREIGN KEY ("author_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD CONSTRAINT "rubric_versions_reviewer_principal_id_principals_principal_id_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD CONSTRAINT "rubric_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bias_test_artifacts" ADD CONSTRAINT "bias_test_artifacts_reviewer_principal_id_principals_principal_id_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bias_test_artifacts" ADD CONSTRAINT "bias_test_artifacts_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_events" ADD CONSTRAINT "rubric_events_rubric_version_id_rubric_versions_rubric_version_id_fk" FOREIGN KEY ("rubric_version_id") REFERENCES "public"."rubric_versions"("rubric_version_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_events" ADD CONSTRAINT "rubric_events_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_events" ADD CONSTRAINT "rubric_events_reviewer_principal_id_principals_principal_id_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_events" ADD CONSTRAINT "rubric_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_dispatch_gate_events" ADD CONSTRAINT "rubric_dispatch_gate_events_bias_test_artifact_id_bias_test_artifacts_bias_test_artifact_id_fk" FOREIGN KEY ("bias_test_artifact_id") REFERENCES "public"."bias_test_artifacts"("bias_test_artifact_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rubric_dispatch_gate_events" ADD CONSTRAINT "rubric_dispatch_gate_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_versions_ref_unique_idx" ON "rubric_versions" USING btree ("rubric_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_versions_audit_event_idx" ON "rubric_versions" USING btree ("audit_event_id") WHERE "rubric_versions"."audit_event_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "rubric_versions_side_status_idx" ON "rubric_versions" USING btree ("side","status","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "bias_test_artifacts_rubric_idx" ON "bias_test_artifacts" USING btree ("rubric_id","rubric_version");
--> statement-breakpoint
CREATE INDEX "bias_test_artifacts_status_idx" ON "bias_test_artifacts" USING btree ("status","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "rubric_events_rubric_idx" ON "rubric_events" USING btree ("rubric_version_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "rubric_events_actor_idx" ON "rubric_events" USING btree ("principal_id","created_at" DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_events_audit_event_idx" ON "rubric_events" USING btree ("audit_event_id");
--> statement-breakpoint
CREATE INDEX "rubric_dispatch_gate_events_ref_idx" ON "rubric_dispatch_gate_events" USING btree ("rubric_id","rubric_version","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "rubric_dispatch_gate_events_reason_idx" ON "rubric_dispatch_gate_events" USING btree ("reason_code","created_at" DESC);
