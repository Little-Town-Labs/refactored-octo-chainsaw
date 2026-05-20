CREATE TABLE "privacy_ruleset_versions" (
  "privacy_ruleset_version_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "ruleset_id" text NOT NULL,
  "version" text NOT NULL,
  "audience" text NOT NULL,
  "status" text NOT NULL,
  "disclosure_stages" jsonb NOT NULL,
  "allowed_fields" jsonb NOT NULL,
  "redaction_rules" jsonb NOT NULL,
  "refusal_rules" jsonb NOT NULL,
  "max_input_chars" integer NOT NULL,
  "content_hash" text NOT NULL,
  "audit_event_id" uuid,
  "published_at" timestamp with time zone,
  "deprecated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "privacy_ruleset_versions_ruleset_id_check" CHECK ("privacy_ruleset_versions"."ruleset_id" <> ''),
  CONSTRAINT "privacy_ruleset_versions_version_check" CHECK ("privacy_ruleset_versions"."version" <> ''),
  CONSTRAINT "privacy_ruleset_versions_audience_check" CHECK ("privacy_ruleset_versions"."audience" IN ('seeker','employer','platform')),
  CONSTRAINT "privacy_ruleset_versions_status_check" CHECK ("privacy_ruleset_versions"."status" IN ('draft','published','deprecated')),
  CONSTRAINT "privacy_ruleset_versions_stages_check" CHECK (jsonb_array_length("privacy_ruleset_versions"."disclosure_stages") > 0),
  CONSTRAINT "privacy_ruleset_versions_max_chars_check" CHECK ("privacy_ruleset_versions"."max_input_chars" > 0),
  CONSTRAINT "privacy_ruleset_versions_hash_check" CHECK ("privacy_ruleset_versions"."content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "privacy_filter_decisions" (
  "filter_decision_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "run_id" text NOT NULL,
  "ruleset_id" text NOT NULL,
  "ruleset_version" text NOT NULL,
  "audience" text NOT NULL,
  "disclosure_stage" text NOT NULL,
  "decision" text NOT NULL,
  "reason_code" text NOT NULL,
  "redaction_summary" jsonb NOT NULL,
  "source_content_hash" text NOT NULL,
  "filtered_view_ref" text,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "privacy_filter_decisions_run_id_check" CHECK ("privacy_filter_decisions"."run_id" <> ''),
  CONSTRAINT "privacy_filter_decisions_audience_check" CHECK ("privacy_filter_decisions"."audience" IN ('seeker','employer','platform')),
  CONSTRAINT "privacy_filter_decisions_decision_check" CHECK ("privacy_filter_decisions"."decision" IN ('allow','redact','refuse')),
  CONSTRAINT "privacy_filter_decisions_reason_code_check" CHECK ("privacy_filter_decisions"."reason_code" IN ('privacy_allowed','privacy_redacted','privacy_refused','privacy_ruleset_missing','privacy_ruleset_unpublished','privacy_ruleset_invalid','privacy_payload_oversized','privacy_unsupported_input_class','privacy_all_content_redacted','sentinel_missing','sentinel_mismatch','sentinel_duplicate','sentinel_injection_detected','counterparty_access_bypass_detected')),
  CONSTRAINT "privacy_filter_decisions_hash_check" CHECK ("privacy_filter_decisions"."source_content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "sentinel_failures" (
  "sentinel_failure_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "run_id" text NOT NULL,
  "input_class" text NOT NULL,
  "reason_code" text NOT NULL,
  "source_content_hash" text NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sentinel_failures_run_id_check" CHECK ("sentinel_failures"."run_id" <> ''),
  CONSTRAINT "sentinel_failures_input_class_check" CHECK ("sentinel_failures"."input_class" IN ('seeker_resume','employer_req','ats_import','tool_returned','a2a_received')),
  CONSTRAINT "sentinel_failures_reason_code_check" CHECK ("sentinel_failures"."reason_code" IN ('sentinel_missing','sentinel_mismatch','sentinel_duplicate','sentinel_injection_detected')),
  CONSTRAINT "sentinel_failures_hash_check" CHECK ("sentinel_failures"."source_content_hash" <> '')
);
--> statement-breakpoint
CREATE TABLE "counterparty_access_findings" (
  "finding_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "source_path" text NOT NULL,
  "forbidden_access" text NOT NULL,
  "detected_by" text NOT NULL,
  "status" text NOT NULL,
  "audit_event_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "counterparty_access_findings_path_check" CHECK ("counterparty_access_findings"."source_path" <> ''),
  CONSTRAINT "counterparty_access_findings_access_check" CHECK ("counterparty_access_findings"."forbidden_access" <> ''),
  CONSTRAINT "counterparty_access_findings_detected_by_check" CHECK ("counterparty_access_findings"."detected_by" <> ''),
  CONSTRAINT "counterparty_access_findings_status_check" CHECK ("counterparty_access_findings"."status" IN ('open','resolved','expected_fixture'))
);
--> statement-breakpoint
ALTER TABLE "privacy_ruleset_versions" ADD CONSTRAINT "privacy_ruleset_versions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "privacy_filter_decisions" ADD CONSTRAINT "privacy_filter_decisions_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sentinel_failures" ADD CONSTRAINT "sentinel_failures_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "counterparty_access_findings" ADD CONSTRAINT "counterparty_access_findings_audit_event_id_audit_log_events_audit_event_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_ruleset_versions_ref_unique_idx" ON "privacy_ruleset_versions" USING btree ("ruleset_id","version");
--> statement-breakpoint
CREATE INDEX "privacy_ruleset_versions_status_idx" ON "privacy_ruleset_versions" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "privacy_filter_decisions_run_idx" ON "privacy_filter_decisions" USING btree ("run_id","created_at");
--> statement-breakpoint
CREATE INDEX "privacy_filter_decisions_reason_idx" ON "privacy_filter_decisions" USING btree ("reason_code","created_at");
--> statement-breakpoint
CREATE INDEX "sentinel_failures_run_idx" ON "sentinel_failures" USING btree ("run_id","created_at");
--> statement-breakpoint
CREATE INDEX "counterparty_access_findings_status_idx" ON "counterparty_access_findings" USING btree ("status","created_at");
