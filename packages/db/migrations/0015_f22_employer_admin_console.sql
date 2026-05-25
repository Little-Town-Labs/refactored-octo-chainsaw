CREATE TABLE "employer_organization_profiles" (
  "profile_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "org_id" uuid NOT NULL,
  "company_name" text NOT NULL,
  "company_summary" text NOT NULL,
  "mission" text NOT NULL,
  "culture" text NOT NULL,
  "benefits" text NOT NULL,
  "workplace_policy" text NOT NULL,
  "updated_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "employer_organization_profiles_company_name_check" CHECK ("employer_organization_profiles"."company_name" <> ''),
  CONSTRAINT "employer_organization_profiles_summary_check" CHECK ("employer_organization_profiles"."company_summary" <> '')
);
--> statement-breakpoint
ALTER TABLE "employer_req_tickets" ADD COLUMN "decision_locus_jurisdiction" text DEFAULT 'US-UNSPECIFIED' NOT NULL;
--> statement-breakpoint
ALTER TABLE "employer_req_tickets" ADD COLUMN "threshold" integer DEFAULT 75 NOT NULL;
--> statement-breakpoint
ALTER TABLE "employer_organization_profiles" ADD CONSTRAINT "employer_organization_profiles_org_id_organizations_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "employer_organization_profiles" ADD CONSTRAINT "employer_organization_profiles_updated_by_principals_principal_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "employer_req_tickets" ADD CONSTRAINT "employer_req_tickets_decision_locus_check" CHECK ("employer_req_tickets"."decision_locus_jurisdiction" <> '');
--> statement-breakpoint
ALTER TABLE "employer_req_tickets" ADD CONSTRAINT "employer_req_tickets_threshold_check" CHECK ("employer_req_tickets"."threshold" >= 0 AND "employer_req_tickets"."threshold" <= 100);
--> statement-breakpoint
CREATE UNIQUE INDEX "employer_organization_profiles_org_idx" ON "employer_organization_profiles" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "employer_organization_profiles_updated_idx" ON "employer_organization_profiles" USING btree ("updated_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "employer_req_tickets_decision_locus_idx" ON "employer_req_tickets" USING btree ("decision_locus_jurisdiction");
