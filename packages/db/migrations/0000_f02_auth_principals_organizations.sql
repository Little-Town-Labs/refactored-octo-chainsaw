CREATE TABLE "organizations" (
	"org_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"kind" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "organizations_kind_check" CHECK ("organizations"."kind" IN ('employer', 'operator'))
);
--> statement-breakpoint
CREATE TABLE "principals" (
	"principal_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" text NOT NULL,
	"external_idp" text,
	"external_id" text,
	"tier" text,
	"org_id" uuid,
	"service_name" text,
	"service_version" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	"disabled_reason" text,
	CONSTRAINT "principals_kind_check" CHECK ("principals"."kind" IN ('human', 'agent', 'service')),
	CONSTRAINT "principals_tier_check" CHECK ("principals"."tier" IS NULL OR "principals"."tier" IN ('seeker','employer_admin','employer_member','operator')),
	CONSTRAINT "principals_human_invariant" CHECK ("principals"."kind" <> 'human' OR ("principals"."external_idp" = 'clerk' AND "principals"."external_id" IS NOT NULL AND "principals"."tier" IS NOT NULL)),
	CONSTRAINT "principals_agent_invariant" CHECK ("principals"."kind" <> 'agent' OR ("principals"."external_idp" IS NULL AND "principals"."service_name" IS NULL)),
	CONSTRAINT "principals_service_invariant" CHECK ("principals"."kind" <> 'service' OR ("principals"."service_name" IS NOT NULL AND "principals"."service_version" IS NOT NULL)),
	CONSTRAINT "principals_tier_org_invariant" CHECK ("principals"."tier" IS NULL OR "principals"."tier" = 'seeker' OR "principals"."org_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "principals" ADD CONSTRAINT "principals_org_id_organizations_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("org_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clerk_org_idx" ON "organizations" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX "organizations_kind_idx" ON "organizations" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "principals_external_idx" ON "principals" USING btree ("external_idp","external_id") WHERE "principals"."external_idp" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "principals_kind_tier_idx" ON "principals" USING btree ("kind","tier");--> statement-breakpoint
CREATE INDEX "principals_org_idx" ON "principals" USING btree ("org_id") WHERE "principals"."org_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "principals_created_at_idx" ON "principals" USING btree ("created_at" DESC NULLS LAST);