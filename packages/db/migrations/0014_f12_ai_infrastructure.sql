CREATE TABLE "ai_prompt_versions" (
  "prompt_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "prompt_id" text NOT NULL,
  "version" text NOT NULL,
  "status" text NOT NULL,
  "purpose" text NOT NULL,
  "template_ref" text NOT NULL,
  "content_hash" text NOT NULL,
  "variable_contract" jsonb NOT NULL,
  "allowed_scopes" jsonb NOT NULL,
  "rubric_boundary" text NOT NULL,
  "release_manifest_ref" text,
  "signature_ref" text,
  "published_by" uuid,
  "published_at" timestamp with time zone,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_prompt_versions_prompt_id_check" CHECK ("ai_prompt_versions"."prompt_id" <> ''),
  CONSTRAINT "ai_prompt_versions_version_check" CHECK ("ai_prompt_versions"."version" <> ''),
  CONSTRAINT "ai_prompt_versions_status_check" CHECK ("ai_prompt_versions"."status" IN ('draft','published','deprecated','retired','superseded')),
  CONSTRAINT "ai_prompt_versions_purpose_check" CHECK ("ai_prompt_versions"."purpose" <> ''),
  CONSTRAINT "ai_prompt_versions_template_ref_check" CHECK ("ai_prompt_versions"."template_ref" <> ''),
  CONSTRAINT "ai_prompt_versions_hash_check" CHECK ("ai_prompt_versions"."content_hash" <> ''),
  CONSTRAINT "ai_prompt_versions_rubric_boundary_check" CHECK ("ai_prompt_versions"."rubric_boundary" IN ('no_rubric_weights','no_scoring_policy')),
  CONSTRAINT "ai_prompt_versions_published_shape_check" CHECK ("ai_prompt_versions"."status" <> 'published' OR ("ai_prompt_versions"."release_manifest_ref" IS NOT NULL AND "ai_prompt_versions"."signature_ref" IS NOT NULL AND "ai_prompt_versions"."published_by" IS NOT NULL AND "ai_prompt_versions"."published_at" IS NOT NULL AND "ai_prompt_versions"."audit_event_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "ai_model_profile_versions" (
  "model_profile_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "model_profile_id" text NOT NULL,
  "version" text NOT NULL,
  "status" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "capability_class" text NOT NULL,
  "risk_tier" text NOT NULL,
  "allowed_scopes" jsonb NOT NULL,
  "cost_metadata" jsonb NOT NULL,
  "supply_chain_evidence" jsonb NOT NULL,
  "release_manifest_ref" text,
  "signature_ref" text,
  "published_by" uuid,
  "published_at" timestamp with time zone,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_model_profile_versions_profile_id_check" CHECK ("ai_model_profile_versions"."model_profile_id" <> ''),
  CONSTRAINT "ai_model_profile_versions_version_check" CHECK ("ai_model_profile_versions"."version" <> ''),
  CONSTRAINT "ai_model_profile_versions_status_check" CHECK ("ai_model_profile_versions"."status" IN ('draft','published','deprecated','retired','superseded')),
  CONSTRAINT "ai_model_profile_versions_provider_check" CHECK ("ai_model_profile_versions"."provider" <> ''),
  CONSTRAINT "ai_model_profile_versions_model_check" CHECK ("ai_model_profile_versions"."model" <> ''),
  CONSTRAINT "ai_model_profile_versions_capability_check" CHECK ("ai_model_profile_versions"."capability_class" IN ('chat','reasoning','embedding','classification','evaluation')),
  CONSTRAINT "ai_model_profile_versions_risk_tier_check" CHECK ("ai_model_profile_versions"."risk_tier" IN ('low','medium','high')),
  CONSTRAINT "ai_model_profile_versions_published_shape_check" CHECK ("ai_model_profile_versions"."status" <> 'published' OR ("ai_model_profile_versions"."release_manifest_ref" IS NOT NULL AND "ai_model_profile_versions"."signature_ref" IS NOT NULL AND "ai_model_profile_versions"."published_by" IS NOT NULL AND "ai_model_profile_versions"."published_at" IS NOT NULL AND "ai_model_profile_versions"."audit_event_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "ai_runtime_manifests" (
  "runtime_manifest_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "manifest_id" text NOT NULL,
  "version" text NOT NULL,
  "status" text NOT NULL,
  "deployment_scope" text NOT NULL,
  "prompt_refs" jsonb NOT NULL,
  "model_refs" jsonb NOT NULL,
  "caller_scopes" jsonb NOT NULL,
  "provider_allowlist" jsonb NOT NULL,
  "cost_controls" jsonb NOT NULL,
  "fallback_policy" text NOT NULL,
  "no_hot_reload" boolean NOT NULL,
  "content_hash" text NOT NULL,
  "signature_ref" text NOT NULL,
  "published_by" uuid,
  "published_at" timestamp with time zone,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_runtime_manifests_manifest_id_check" CHECK ("ai_runtime_manifests"."manifest_id" <> ''),
  CONSTRAINT "ai_runtime_manifests_version_check" CHECK ("ai_runtime_manifests"."version" <> ''),
  CONSTRAINT "ai_runtime_manifests_status_check" CHECK ("ai_runtime_manifests"."status" IN ('draft','active','superseded','retired','revoked')),
  CONSTRAINT "ai_runtime_manifests_deployment_scope_check" CHECK ("ai_runtime_manifests"."deployment_scope" <> ''),
  CONSTRAINT "ai_runtime_manifests_fallback_policy_check" CHECK ("ai_runtime_manifests"."fallback_policy" IN ('none','refuse','manifest_authorized')),
  CONSTRAINT "ai_runtime_manifests_no_hot_reload_check" CHECK ("ai_runtime_manifests"."no_hot_reload" = true),
  CONSTRAINT "ai_runtime_manifests_hash_check" CHECK ("ai_runtime_manifests"."content_hash" <> ''),
  CONSTRAINT "ai_runtime_manifests_signature_ref_check" CHECK ("ai_runtime_manifests"."signature_ref" <> '')
);
--> statement-breakpoint
CREATE TABLE "ai_model_invocation_records" (
  "invocation_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "status" text NOT NULL,
  "caller_principal_id" uuid NOT NULL,
  "caller_scope" text NOT NULL,
  "run_ref" text NOT NULL,
  "purpose" text NOT NULL,
  "prompt_ref" jsonb NOT NULL,
  "model_ref" jsonb NOT NULL,
  "manifest_ref" jsonb NOT NULL,
  "request_hash" text NOT NULL,
  "rendered_prompt_hash" text,
  "response_hash" text,
  "usage_metadata" jsonb,
  "cost_evidence" jsonb,
  "decision" text NOT NULL,
  "reason_code" text NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_model_invocation_records_status_check" CHECK ("ai_model_invocation_records"."status" IN ('accepted','refused','completed','failed','usage_incomplete')),
  CONSTRAINT "ai_model_invocation_records_caller_scope_check" CHECK ("ai_model_invocation_records"."caller_scope" <> ''),
  CONSTRAINT "ai_model_invocation_records_run_ref_check" CHECK ("ai_model_invocation_records"."run_ref" <> ''),
  CONSTRAINT "ai_model_invocation_records_purpose_check" CHECK ("ai_model_invocation_records"."purpose" <> ''),
  CONSTRAINT "ai_model_invocation_records_request_hash_check" CHECK ("ai_model_invocation_records"."request_hash" <> ''),
  CONSTRAINT "ai_model_invocation_records_decision_check" CHECK ("ai_model_invocation_records"."decision" IN ('allowed','refused','downgraded')),
  CONSTRAINT "ai_model_invocation_records_reason_code_check" CHECK ("ai_model_invocation_records"."reason_code" <> '')
);
--> statement-breakpoint
ALTER TABLE "ai_prompt_versions" ADD CONSTRAINT "ai_prompt_versions_published_by_principals_principal_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_prompt_versions" ADD CONSTRAINT "ai_prompt_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_model_profile_versions" ADD CONSTRAINT "ai_model_profile_versions_published_by_principals_principal_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_model_profile_versions" ADD CONSTRAINT "ai_model_profile_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_runtime_manifests" ADD CONSTRAINT "ai_runtime_manifests_published_by_principals_principal_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_runtime_manifests" ADD CONSTRAINT "ai_runtime_manifests_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_model_invocation_records" ADD CONSTRAINT "ai_model_invocation_records_caller_principal_id_principals_principal_id_fk" FOREIGN KEY ("caller_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_model_invocation_records" ADD CONSTRAINT "ai_model_invocation_records_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_prompt_versions_ref_unique_idx" ON "ai_prompt_versions" USING btree ("prompt_id","version");
--> statement-breakpoint
CREATE INDEX "ai_prompt_versions_status_idx" ON "ai_prompt_versions" USING btree ("status","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_profile_versions_ref_unique_idx" ON "ai_model_profile_versions" USING btree ("model_profile_id","version");
--> statement-breakpoint
CREATE INDEX "ai_model_profile_versions_status_idx" ON "ai_model_profile_versions" USING btree ("status","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_runtime_manifests_ref_unique_idx" ON "ai_runtime_manifests" USING btree ("manifest_id","version");
--> statement-breakpoint
CREATE INDEX "ai_runtime_manifests_status_idx" ON "ai_runtime_manifests" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "ai_model_invocation_records_run_idx" ON "ai_model_invocation_records" USING btree ("run_ref","created_at");
--> statement-breakpoint
CREATE INDEX "ai_model_invocation_records_caller_idx" ON "ai_model_invocation_records" USING btree ("caller_principal_id","created_at");
