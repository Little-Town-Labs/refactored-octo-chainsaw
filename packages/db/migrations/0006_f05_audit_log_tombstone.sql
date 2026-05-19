CREATE TABLE "audit_log_events" (
	"audit_event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"source_table" text,
	"source_event_id" uuid,
	"event_name" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"principal_kind" text NOT NULL,
	"role_or_scope" text,
	"correlation_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"previous_hash" text,
	"event_hash" text NOT NULL,
	"chain_namespace" text NOT NULL,
	"hash_algorithm" text NOT NULL,
	"canonicalization_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tombstoned_at" timestamp with time zone,
	CONSTRAINT "audit_log_events_principal_kind_check" CHECK ("audit_log_events"."principal_kind" IN ('human','agent','service')),
	CONSTRAINT "audit_log_events_source_pair_check" CHECK (("audit_log_events"."source_table" IS NULL) = ("audit_log_events"."source_event_id" IS NULL)),
	CONSTRAINT "audit_log_events_hash_algorithm_check" CHECK ("audit_log_events"."hash_algorithm" IN ('sha256')),
	CONSTRAINT "audit_log_events_canonicalization_version_check" CHECK ("audit_log_events"."canonicalization_version" <> ''),
	CONSTRAINT "audit_log_events_tombstone_payload_check" CHECK ("audit_log_events"."tombstoned_at" IS NULL OR "audit_log_events"."payload" ? 'tombstone')
);
--> statement-breakpoint
CREATE TABLE "evidence_exports" (
	"export_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"requested_by_principal_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"filters" jsonb NOT NULL,
	"manifest_hash" text NOT NULL,
	"chain_verification_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_exports_purpose_check" CHECK ("evidence_exports"."purpose" IN ('incident','counsel','audit','operator_review')),
	CONSTRAINT "evidence_exports_chain_status_check" CHECK ("evidence_exports"."chain_verification_status" IN ('valid','invalid') OR "evidence_exports"."chain_verification_status" LIKE 'invalid:%')
);
--> statement-breakpoint
CREATE TABLE "tombstone_records" (
	"tombstone_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"subject_ref" text NOT NULL,
	"lawful_basis" text NOT NULL,
	"procedure_version" text NOT NULL,
	"operator_principal_id" uuid NOT NULL,
	"original_hash" text NOT NULL,
	"replacement_hash" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tombstone_records_target_kind_check" CHECK ("tombstone_records"."target_kind" IN ('audit_event','transcript_turn')),
	CONSTRAINT "tombstone_records_hashes_differ_check" CHECK ("tombstone_records"."original_hash" <> "tombstone_records"."replacement_hash")
);
--> statement-breakpoint
CREATE TABLE "transcript_turns" (
	"transcript_turn_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"match_ticket_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"side" text NOT NULL,
	"turn_index" integer NOT NULL,
	"contract_id" text,
	"contract_version" text,
	"rubric_id" text,
	"rubric_version" text,
	"model_ref" text,
	"tool_call_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" jsonb,
	"content_hash" text NOT NULL,
	"audit_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tombstoned_at" timestamp with time zone,
	CONSTRAINT "transcript_turns_side_check" CHECK ("transcript_turns"."side" IN ('seeker','employer')),
	CONSTRAINT "transcript_turns_tombstone_content_check" CHECK ("transcript_turns"."tombstoned_at" IS NULL OR "transcript_turns"."content" IS NULL)
);
--> statement-breakpoint
ALTER TABLE "audit_log_events" ADD CONSTRAINT "audit_log_events_principal_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evidence_exports" ADD CONSTRAINT "evidence_exports_requested_by_fk" FOREIGN KEY ("requested_by_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tombstone_records" ADD CONSTRAINT "tombstone_records_operator_fk" FOREIGN KEY ("operator_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tombstone_records" ADD CONSTRAINT "tombstone_records_audit_event_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_match_fk" FOREIGN KEY ("match_ticket_id") REFERENCES "public"."match_tickets"("match_ticket_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_audit_event_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_log_events"("audit_event_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_log_events_hash_idx" ON "audit_log_events" USING btree ("event_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_log_events_source_replay_idx" ON "audit_log_events" USING btree ("source_table","source_event_id") WHERE "audit_log_events"."source_table" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "audit_log_events_chain_order_idx" ON "audit_log_events" USING btree ("chain_namespace","created_at","audit_event_id");
--> statement-breakpoint
CREATE INDEX "audit_log_events_principal_idx" ON "audit_log_events" USING btree ("principal_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "audit_log_events_correlation_idx" ON "audit_log_events" USING btree ("correlation_id","created_at" DESC NULLS LAST) WHERE "audit_log_events"."correlation_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_exports_manifest_hash_idx" ON "evidence_exports" USING btree ("manifest_hash");
--> statement-breakpoint
CREATE INDEX "evidence_exports_requested_by_idx" ON "evidence_exports" USING btree ("requested_by_principal_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE UNIQUE INDEX "tombstone_records_target_idx" ON "tombstone_records" USING btree ("target_kind","target_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "tombstone_records_audit_event_idx" ON "tombstone_records" USING btree ("audit_event_id");
--> statement-breakpoint
CREATE INDEX "tombstone_records_operator_idx" ON "tombstone_records" USING btree ("operator_principal_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_turns_idempotency_idx" ON "transcript_turns" USING btree ("run_id","side","turn_index");
--> statement-breakpoint
CREATE INDEX "transcript_turns_match_idx" ON "transcript_turns" USING btree ("match_ticket_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_turns_audit_event_idx" ON "transcript_turns" USING btree ("audit_event_id");
