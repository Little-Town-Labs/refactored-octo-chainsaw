CREATE TABLE "employer_req_tickets" (
	"employer_req_ticket_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"principal_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"state" text NOT NULL,
	"role_title" text NOT NULL,
	"role_level" text NOT NULL,
	"comp_band_min" integer NOT NULL,
	"comp_band_max" integer NOT NULL,
	"currency" text NOT NULL,
	"jurisdictions" jsonb NOT NULL,
	"work_mode" text NOT NULL,
	"headcount_total" integer NOT NULL,
	"headcount_filled" integer DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "employer_req_tickets_state_check" CHECK ("employer_req_tickets"."state" IN ('draft','submitted','open','matching','filled','closed','withdrawn')),
	CONSTRAINT "employer_req_tickets_role_level_check" CHECK ("employer_req_tickets"."role_level" IN ('intern','junior','mid','senior','staff','principal','manager','director','vp','exec')),
	CONSTRAINT "employer_req_tickets_work_mode_check" CHECK ("employer_req_tickets"."work_mode" IN ('remote','hybrid','onsite')),
	CONSTRAINT "employer_req_tickets_comp_band_order_check" CHECK ("employer_req_tickets"."comp_band_min" <= "employer_req_tickets"."comp_band_max"),
	CONSTRAINT "employer_req_tickets_headcount_check" CHECK ("employer_req_tickets"."headcount_total" >= 1 AND "employer_req_tickets"."headcount_filled" >= 0 AND "employer_req_tickets"."headcount_filled" <= "employer_req_tickets"."headcount_total"),
	CONSTRAINT "employer_req_tickets_jurisdictions_nonempty" CHECK (jsonb_typeof("employer_req_tickets"."jurisdictions") = 'array' AND jsonb_array_length("employer_req_tickets"."jurisdictions") >= 1),
	CONSTRAINT "employer_req_tickets_identifier_shape_check" CHECK ("employer_req_tickets"."identifier" ~ '^ER-[0-9]{4}-[0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "match_tickets" (
	"match_ticket_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"identifier" text NOT NULL,
	"seeker_ticket_id" uuid NOT NULL,
	"employer_req_ticket_id" uuid NOT NULL,
	"state" text NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"round_cap" integer NOT NULL,
	"run_id" uuid,
	"attempt" integer DEFAULT 1 NOT NULL,
	"seeker_contract_id" text NOT NULL,
	"seeker_contract_version" text NOT NULL,
	"employer_contract_id" text NOT NULL,
	"employer_contract_version" text NOT NULL,
	"privacy_ruleset_id" text NOT NULL,
	"privacy_ruleset_version" text NOT NULL,
	"decision_locus_jurisdiction" text NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dossier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "match_tickets_state_check" CHECK ("match_tickets"."state" IN ('created','negotiating','delivered','accepted','rejected','expired')),
	CONSTRAINT "match_tickets_round_bounds_check" CHECK ("match_tickets"."round" >= 0 AND "match_tickets"."round" <= "match_tickets"."round_cap"),
	CONSTRAINT "match_tickets_round_cap_check" CHECK ("match_tickets"."round_cap" >= 1),
	CONSTRAINT "match_tickets_attempt_check" CHECK ("match_tickets"."attempt" >= 1),
	CONSTRAINT "match_tickets_identifier_shape_check" CHECK ("match_tickets"."identifier" ~ '^MT-[0-9]{4}-[0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "seeker_tickets" (
	"seeker_ticket_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"principal_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"state" text NOT NULL,
	"role_family" text NOT NULL,
	"comp_band_min" integer NOT NULL,
	"comp_band_max" integer NOT NULL,
	"currency" text NOT NULL,
	"jurisdictions" jsonb NOT NULL,
	"work_mode" text NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "seeker_tickets_state_check" CHECK ("seeker_tickets"."state" IN ('draft','submitted','screening','matching','matched','closed','withdrawn')),
	CONSTRAINT "seeker_tickets_work_mode_check" CHECK ("seeker_tickets"."work_mode" IN ('remote','hybrid','onsite')),
	CONSTRAINT "seeker_tickets_comp_band_order_check" CHECK ("seeker_tickets"."comp_band_min" <= "seeker_tickets"."comp_band_max"),
	CONSTRAINT "seeker_tickets_jurisdictions_nonempty" CHECK (jsonb_typeof("seeker_tickets"."jurisdictions") = 'array' AND jsonb_array_length("seeker_tickets"."jurisdictions") >= 1),
	CONSTRAINT "seeker_tickets_identifier_shape_check" CHECK ("seeker_tickets"."identifier" ~ '^ST-[0-9]{4}-[0-9]{5}$')
);
--> statement-breakpoint
ALTER TABLE "employer_req_tickets" ADD CONSTRAINT "employer_req_tickets_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_req_tickets" ADD CONSTRAINT "employer_req_tickets_org_id_organizations_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("org_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_tickets" ADD CONSTRAINT "match_tickets_seeker_ticket_id_seeker_tickets_seeker_ticket_id_fk" FOREIGN KEY ("seeker_ticket_id") REFERENCES "public"."seeker_tickets"("seeker_ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_tickets" ADD CONSTRAINT "match_tickets_employer_req_ticket_id_employer_req_tickets_employer_req_ticket_id_fk" FOREIGN KEY ("employer_req_ticket_id") REFERENCES "public"."employer_req_tickets"("employer_req_ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeker_tickets" ADD CONSTRAINT "seeker_tickets_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employer_req_tickets_identifier_idx" ON "employer_req_tickets" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "employer_req_tickets_state_hot_idx" ON "employer_req_tickets" USING btree ("state") WHERE "employer_req_tickets"."state" IN ('matching','open');--> statement-breakpoint
CREATE INDEX "employer_req_tickets_org_idx" ON "employer_req_tickets" USING btree ("org_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "match_tickets_identifier_idx" ON "match_tickets" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "match_tickets_idempotency_idx" ON "match_tickets" USING btree ("seeker_ticket_id","employer_req_ticket_id","attempt");--> statement-breakpoint
CREATE INDEX "match_tickets_state_hot_idx" ON "match_tickets" USING btree ("state") WHERE "match_tickets"."state" IN ('negotiating','created');--> statement-breakpoint
CREATE INDEX "match_tickets_seeker_fk_idx" ON "match_tickets" USING btree ("seeker_ticket_id");--> statement-breakpoint
CREATE INDEX "match_tickets_employer_fk_idx" ON "match_tickets" USING btree ("employer_req_ticket_id");--> statement-breakpoint
CREATE INDEX "match_tickets_run_id_idx" ON "match_tickets" USING btree ("run_id") WHERE "match_tickets"."run_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "match_tickets_jurisdiction_idx" ON "match_tickets" USING btree ("decision_locus_jurisdiction");--> statement-breakpoint
CREATE UNIQUE INDEX "seeker_tickets_identifier_idx" ON "seeker_tickets" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "seeker_tickets_state_hot_idx" ON "seeker_tickets" USING btree ("state") WHERE "seeker_tickets"."state" IN ('matching','screening');--> statement-breakpoint
CREATE INDEX "seeker_tickets_principal_idx" ON "seeker_tickets" USING btree ("principal_id","created_at" DESC NULLS LAST);--> statement-breakpoint
-- F04 T008 — Identifier-allocator sequences (FR-7, R-3).
-- One sequence per (kind × current year). The annual-rollover
-- Inngest cron (T017) pre-creates next year's sequences on Dec 1.
-- This migration bootstraps the initial 2026 sequences.
CREATE SEQUENCE IF NOT EXISTS "seeker_tickets_2026_seq" START 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "employer_req_tickets_2026_seq" START 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "match_tickets_2026_seq" START 1;
