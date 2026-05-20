CREATE TABLE "candidate_notice_template_versions" (
  "notice_template_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "template_id" text NOT NULL,
  "version" text NOT NULL,
  "status" text NOT NULL,
  "notice_category" text NOT NULL,
  "jurisdiction_scope" jsonb NOT NULL,
  "content_ref" text NOT NULL,
  "content_hash" text NOT NULL,
  "effective_from" timestamp with time zone NOT NULL,
  "effective_until" timestamp with time zone,
  "published_at" timestamp with time zone,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "candidate_notice_template_versions_template_id_check" CHECK ("candidate_notice_template_versions"."template_id" <> ''),
  CONSTRAINT "candidate_notice_template_versions_version_check" CHECK ("candidate_notice_template_versions"."version" <> ''),
  CONSTRAINT "candidate_notice_template_versions_status_check" CHECK ("candidate_notice_template_versions"."status" IN ('draft','published','retired','superseded')),
  CONSTRAINT "candidate_notice_template_versions_category_check" CHECK ("candidate_notice_template_versions"."notice_category" IN ('advance_aedt_notice','outcome_transparency','inconclusive_outcome','policy_update')),
  CONSTRAINT "candidate_notice_template_versions_hash_check" CHECK ("candidate_notice_template_versions"."content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "candidate_notification_artifacts" (
  "artifact_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "match_id" uuid NOT NULL,
  "run_id" text NOT NULL,
  "dossier_id" uuid NOT NULL,
  "candidate_principal_id" uuid NOT NULL,
  "notice_category" text NOT NULL,
  "status" text NOT NULL,
  "template_id" text NOT NULL,
  "template_version" text NOT NULL,
  "jurisdiction_refs" jsonb NOT NULL,
  "policy_ref" jsonb NOT NULL,
  "timing" jsonb NOT NULL,
  "content_refs" jsonb NOT NULL,
  "content_hash" text NOT NULL,
  "reason_code" text NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "candidate_notification_artifacts_run_id_check" CHECK ("candidate_notification_artifacts"."run_id" <> ''),
  CONSTRAINT "candidate_notification_artifacts_category_check" CHECK ("candidate_notification_artifacts"."notice_category" IN ('advance_aedt_notice','outcome_transparency','inconclusive_outcome','policy_update')),
  CONSTRAINT "candidate_notification_artifacts_status_check" CHECK ("candidate_notification_artifacts"."status" IN ('ready','blocked','superseded','delivered_intent_created')),
  CONSTRAINT "candidate_notification_artifacts_hash_check" CHECK ("candidate_notification_artifacts"."content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "candidate_notification_gate_events" (
  "gate_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "artifact_id" uuid,
  "match_id" uuid NOT NULL,
  "decision" text NOT NULL,
  "reason_code" text NOT NULL,
  "evaluated_at" timestamp with time zone NOT NULL,
  "policy_ref" jsonb NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "candidate_notification_gate_events_decision_check" CHECK ("candidate_notification_gate_events"."decision" IN ('allowed','refused')),
  CONSTRAINT "candidate_notification_gate_events_reason_code_check" CHECK ("candidate_notification_gate_events"."reason_code" IN ('notice_ready','missing_artifact','artifact_blocked','template_not_published','template_superseded','not_yet_eligible','missing_recipient','invalid_payload','policy_blocked'))
);
--> statement-breakpoint
CREATE TABLE "candidate_notification_delivery_commands" (
  "command_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "artifact_id" uuid NOT NULL,
  "candidate_principal_id" uuid NOT NULL,
  "notice_category" text NOT NULL,
  "channel_intent" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "content_hash" text NOT NULL,
  "delivery_window" jsonb NOT NULL,
  "status" text NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "candidate_notification_delivery_commands_category_check" CHECK ("candidate_notification_delivery_commands"."notice_category" IN ('advance_aedt_notice','outcome_transparency','inconclusive_outcome','policy_update')),
  CONSTRAINT "candidate_notification_delivery_commands_channel_check" CHECK ("candidate_notification_delivery_commands"."channel_intent" IN ('email','telegram','web','a2a','unspecified')),
  CONSTRAINT "candidate_notification_delivery_commands_status_check" CHECK ("candidate_notification_delivery_commands"."status" IN ('pending','claimed','sent','cancelled','failed')),
  CONSTRAINT "candidate_notification_delivery_commands_hash_check" CHECK ("candidate_notification_delivery_commands"."content_hash" <> '')
);
--> statement-breakpoint
ALTER TABLE "candidate_notice_template_versions" ADD CONSTRAINT "candidate_notice_template_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_artifacts" ADD CONSTRAINT "candidate_notification_artifacts_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_artifacts" ADD CONSTRAINT "candidate_notification_artifacts_candidate_principal_id_principals_principal_id_fk" FOREIGN KEY ("candidate_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_gate_events" ADD CONSTRAINT "candidate_notification_gate_events_artifact_id_candidate_notification_artifacts_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."candidate_notification_artifacts"("artifact_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_gate_events" ADD CONSTRAINT "candidate_notification_gate_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_delivery_commands" ADD CONSTRAINT "candidate_notification_delivery_commands_artifact_id_candidate_notification_artifacts_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."candidate_notification_artifacts"("artifact_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_delivery_commands" ADD CONSTRAINT "candidate_notification_delivery_commands_candidate_principal_id_principals_principal_id_fk" FOREIGN KEY ("candidate_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_notification_delivery_commands" ADD CONSTRAINT "candidate_notification_delivery_commands_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_notice_template_versions_ref_unique_idx" ON "candidate_notice_template_versions" USING btree ("template_id","version");
--> statement-breakpoint
CREATE INDEX "candidate_notice_template_versions_status_idx" ON "candidate_notice_template_versions" USING btree ("status","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_notification_artifacts_dossier_category_idx" ON "candidate_notification_artifacts" USING btree ("dossier_id","notice_category","template_id","template_version");
--> statement-breakpoint
CREATE INDEX "candidate_notification_artifacts_match_idx" ON "candidate_notification_artifacts" USING btree ("match_id","created_at");
--> statement-breakpoint
CREATE INDEX "candidate_notification_gate_events_match_idx" ON "candidate_notification_gate_events" USING btree ("match_id","created_at");
--> statement-breakpoint
CREATE INDEX "candidate_notification_gate_events_artifact_idx" ON "candidate_notification_gate_events" USING btree ("artifact_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_notification_delivery_commands_idempotency_idx" ON "candidate_notification_delivery_commands" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "candidate_notification_delivery_commands_artifact_idx" ON "candidate_notification_delivery_commands" USING btree ("artifact_id","created_at");
