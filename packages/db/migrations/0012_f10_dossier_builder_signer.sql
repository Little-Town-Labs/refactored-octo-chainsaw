CREATE TABLE "dossier_artifacts" (
  "dossier_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "run_id" text NOT NULL,
  "match_id" uuid NOT NULL,
  "status" text NOT NULL,
  "contract_refs" jsonb NOT NULL,
  "privacy_ruleset_refs" jsonb NOT NULL,
  "harness_version" text NOT NULL,
  "model_invocation_refs" jsonb NOT NULL,
  "rubric_breakdowns" jsonb NOT NULL,
  "rationales" jsonb NOT NULL,
  "reconciled_flags" jsonb NOT NULL,
  "inconclusive_flags" jsonb NOT NULL,
  "projection_refs" jsonb NOT NULL,
  "content_hash" text NOT NULL,
  "signature" jsonb,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dossier_artifacts_run_id_check" CHECK ("dossier_artifacts"."run_id" <> ''),
  CONSTRAINT "dossier_artifacts_status_check" CHECK ("dossier_artifacts"."status" IN ('conclusive','inconclusive')),
  CONSTRAINT "dossier_artifacts_harness_version_check" CHECK ("dossier_artifacts"."harness_version" <> ''),
  CONSTRAINT "dossier_artifacts_hash_check" CHECK ("dossier_artifacts"."content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "dossier_projections" (
  "projection_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "dossier_id" uuid NOT NULL,
  "audience" text NOT NULL,
  "disclosure_stage" text NOT NULL,
  "ruleset_id" text NOT NULL,
  "ruleset_version" text NOT NULL,
  "payload" jsonb NOT NULL,
  "payload_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dossier_projections_audience_check" CHECK ("dossier_projections"."audience" IN ('seeker','employer','auditor','a2a_receiver')),
  CONSTRAINT "dossier_projections_stage_check" CHECK ("dossier_projections"."disclosure_stage" <> ''),
  CONSTRAINT "dossier_projections_hash_check" CHECK ("dossier_projections"."payload_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "dossier_signatures" (
  "signature_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "dossier_id" uuid NOT NULL,
  "algorithm" text NOT NULL,
  "kid" text NOT NULL,
  "canonicalization_version" text NOT NULL,
  "signed_content_hash" text NOT NULL,
  "signature" text NOT NULL,
  "signed_at" timestamp with time zone NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dossier_signatures_algorithm_check" CHECK ("dossier_signatures"."algorithm" IN ('Ed25519')),
  CONSTRAINT "dossier_signatures_kid_check" CHECK ("dossier_signatures"."kid" <> ''),
  CONSTRAINT "dossier_signatures_hash_check" CHECK ("dossier_signatures"."signed_content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "dossier_verification_events" (
  "verification_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "dossier_id" uuid NOT NULL,
  "decision" text NOT NULL,
  "reason_code" text NOT NULL,
  "kid" text,
  "content_hash" text NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dossier_verification_events_decision_check" CHECK ("dossier_verification_events"."decision" IN ('valid','invalid')),
  CONSTRAINT "dossier_verification_events_reason_code_check" CHECK ("dossier_verification_events"."reason_code" IN ('signature_valid','signature_invalid','unknown_key','signing_disabled','missing_projection','invalid_payload','inconclusive')),
  CONSTRAINT "dossier_verification_events_hash_check" CHECK ("dossier_verification_events"."content_hash" <> '')
);
--> statement-breakpoint
ALTER TABLE "dossier_artifacts" ADD CONSTRAINT "dossier_artifacts_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dossier_projections" ADD CONSTRAINT "dossier_projections_dossier_id_dossier_artifacts_dossier_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossier_artifacts"("dossier_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dossier_signatures" ADD CONSTRAINT "dossier_signatures_dossier_id_dossier_artifacts_dossier_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossier_artifacts"("dossier_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dossier_signatures" ADD CONSTRAINT "dossier_signatures_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dossier_verification_events" ADD CONSTRAINT "dossier_verification_events_dossier_id_dossier_artifacts_dossier_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossier_artifacts"("dossier_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dossier_verification_events" ADD CONSTRAINT "dossier_verification_events_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dossier_artifacts_run_unique_idx" ON "dossier_artifacts" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX "dossier_artifacts_status_idx" ON "dossier_artifacts" USING btree ("status","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "dossier_projections_dossier_audience_idx" ON "dossier_projections" USING btree ("dossier_id","audience");
--> statement-breakpoint
CREATE INDEX "dossier_projections_dossier_idx" ON "dossier_projections" USING btree ("dossier_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "dossier_signatures_dossier_idx" ON "dossier_signatures" USING btree ("dossier_id");
--> statement-breakpoint
CREATE INDEX "dossier_verification_events_dossier_idx" ON "dossier_verification_events" USING btree ("dossier_id","created_at");
