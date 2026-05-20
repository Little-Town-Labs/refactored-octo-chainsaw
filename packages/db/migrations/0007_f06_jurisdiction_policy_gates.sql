CREATE TABLE "jurisdiction_policies" (
	"jurisdiction_policy_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"status" text NOT NULL,
	"policy_version" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"operational_reason" text NOT NULL,
	"reviewer_principal_id" uuid,
	"created_by_principal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jurisdiction_policies_status_check" CHECK ("jurisdiction_policies"."status" IN ('allowed','unsupported','disabled','review_required','retired')),
	CONSTRAINT "jurisdiction_policies_jurisdiction_code_check" CHECK ("jurisdiction_policies"."jurisdiction_code" ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'),
	CONSTRAINT "jurisdiction_policies_policy_version_check" CHECK ("jurisdiction_policies"."policy_version" <> ''),
	CONSTRAINT "jurisdiction_policies_effective_window_check" CHECK ("jurisdiction_policies"."effective_until" IS NULL OR "jurisdiction_policies"."effective_until" > "jurisdiction_policies"."effective_from"),
	CONSTRAINT "jurisdiction_policies_operational_reason_check" CHECK ("jurisdiction_policies"."operational_reason" <> '')
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_gate_decisions" (
	"gate_decision_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"decision" text NOT NULL,
	"reason_code" text NOT NULL,
	"jurisdiction_codes" jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"policy_revision_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"principal_id" uuid,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jurisdiction_gate_decisions_subject_kind_check" CHECK ("jurisdiction_gate_decisions"."subject_kind" IN ('seeker_ticket','employer_req_ticket','match_ticket','run_dispatch')),
	CONSTRAINT "jurisdiction_gate_decisions_decision_check" CHECK ("jurisdiction_gate_decisions"."decision" IN ('allow','deny')),
	CONSTRAINT "jurisdiction_gate_decisions_reason_code_check" CHECK ("jurisdiction_gate_decisions"."reason_code" IN ('all_allowed','missing_jurisdiction','unknown_jurisdiction','unsupported_jurisdiction','disabled_jurisdiction','review_required','expired_policy','conflicting_jurisdictions','unauthorized')),
	CONSTRAINT "jurisdiction_gate_decisions_allow_reason_check" CHECK ("jurisdiction_gate_decisions"."decision" <> 'allow' OR "jurisdiction_gate_decisions"."reason_code" = 'all_allowed'),
	CONSTRAINT "jurisdiction_gate_decisions_deny_reason_check" CHECK ("jurisdiction_gate_decisions"."decision" <> 'deny' OR "jurisdiction_gate_decisions"."reason_code" <> 'all_allowed'),
	CONSTRAINT "jurisdiction_gate_decisions_jurisdictions_shape_check" CHECK (jsonb_typeof("jurisdiction_gate_decisions"."jurisdiction_codes") = 'array' AND ("jurisdiction_gate_decisions"."reason_code" = 'missing_jurisdiction' OR jsonb_array_length("jurisdiction_gate_decisions"."jurisdiction_codes") >= 1)),
	CONSTRAINT "jurisdiction_gate_decisions_policy_revision_ids_array" CHECK (jsonb_typeof("jurisdiction_gate_decisions"."policy_revision_ids") = 'array')
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_kill_switch_events" (
	"kill_switch_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"policy_version" text NOT NULL,
	"operator_principal_id" uuid NOT NULL,
	"reviewer_principal_id" uuid,
	"correlation_id" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jurisdiction_kill_switch_events_jurisdiction_code_check" CHECK ("jurisdiction_kill_switch_events"."jurisdiction_code" ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'),
	CONSTRAINT "jurisdiction_kill_switch_events_from_status_check" CHECK ("jurisdiction_kill_switch_events"."from_status" IN ('allowed','unsupported','disabled','review_required','retired')),
	CONSTRAINT "jurisdiction_kill_switch_events_to_status_check" CHECK ("jurisdiction_kill_switch_events"."to_status" IN ('allowed','unsupported','disabled','review_required','retired')),
	CONSTRAINT "jurisdiction_kill_switch_events_status_changed_check" CHECK ("jurisdiction_kill_switch_events"."from_status" <> "jurisdiction_kill_switch_events"."to_status"),
	CONSTRAINT "jurisdiction_kill_switch_events_reason_code_check" CHECK ("jurisdiction_kill_switch_events"."reason_code" IN ('new_regulation','counsel_directive','incident_response','bias_audit_gap','launch_posture','manual_reenable'))
);
--> statement-breakpoint
ALTER TABLE "jurisdiction_policies" ADD CONSTRAINT "jurisdiction_policies_reviewer_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jurisdiction_policies" ADD CONSTRAINT "jurisdiction_policies_created_by_fk" FOREIGN KEY ("created_by_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jurisdiction_gate_decisions" ADD CONSTRAINT "jurisdiction_gate_decisions_principal_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jurisdiction_gate_decisions" ADD CONSTRAINT "jurisdiction_gate_decisions_audit_event_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jurisdiction_kill_switch_events" ADD CONSTRAINT "jurisdiction_kill_switch_events_operator_fk" FOREIGN KEY ("operator_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jurisdiction_kill_switch_events" ADD CONSTRAINT "jurisdiction_kill_switch_events_reviewer_fk" FOREIGN KEY ("reviewer_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jurisdiction_kill_switch_events" ADD CONSTRAINT "jurisdiction_kill_switch_events_audit_event_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdiction_policies_active_unique_idx" ON "jurisdiction_policies" USING btree ("jurisdiction_code") WHERE "jurisdiction_policies"."effective_until" IS NULL;
--> statement-breakpoint
CREATE INDEX "jurisdiction_policies_effective_idx" ON "jurisdiction_policies" USING btree ("jurisdiction_code","effective_from" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "jurisdiction_gate_decisions_correlation_idx" ON "jurisdiction_gate_decisions" USING btree ("correlation_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "jurisdiction_gate_decisions_subject_idx" ON "jurisdiction_gate_decisions" USING btree ("subject_kind","subject_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "jurisdiction_gate_decisions_jurisdictions_idx" ON "jurisdiction_gate_decisions" USING gin ("jurisdiction_codes");
--> statement-breakpoint
CREATE INDEX "jurisdiction_gate_decisions_principal_idx" ON "jurisdiction_gate_decisions" USING btree ("principal_id","created_at" DESC NULLS LAST) WHERE "jurisdiction_gate_decisions"."principal_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdiction_gate_decisions_audit_event_idx" ON "jurisdiction_gate_decisions" USING btree ("audit_event_id");
--> statement-breakpoint
CREATE INDEX "jurisdiction_kill_switch_events_jurisdiction_idx" ON "jurisdiction_kill_switch_events" USING btree ("jurisdiction_code","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "jurisdiction_kill_switch_events_operator_idx" ON "jurisdiction_kill_switch_events" USING btree ("operator_principal_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdiction_kill_switch_events_audit_event_idx" ON "jurisdiction_kill_switch_events" USING btree ("audit_event_id");
