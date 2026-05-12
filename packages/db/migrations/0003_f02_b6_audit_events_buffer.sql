CREATE TABLE "audit_events_buffer" (
	"event_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"event_name" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"principal_kind" text NOT NULL,
	"role_or_scope" text,
	"correlation_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_buffer_principal_kind_check" CHECK ("audit_events_buffer"."principal_kind" IN ('human', 'agent', 'service'))
);
--> statement-breakpoint
ALTER TABLE "audit_events_buffer" ADD CONSTRAINT "audit_events_buffer_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_buffer_created_at_idx" ON "audit_events_buffer" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_buffer_principal_idx" ON "audit_events_buffer" USING btree ("principal_id","created_at" DESC NULLS LAST);