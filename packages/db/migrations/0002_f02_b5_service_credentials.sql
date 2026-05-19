CREATE TABLE "service_credentials" (
	"credential_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"principal_id" uuid NOT NULL,
	"scope_set" jsonb NOT NULL,
	"kid" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revocation_reason" text,
	"rotation_generation" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "service_credentials_scope_set_nonempty" CHECK (jsonb_typeof("service_credentials"."scope_set") = 'array' AND jsonb_array_length("service_credentials"."scope_set") >= 1),
	CONSTRAINT "service_credentials_ttl_ceiling" CHECK ("service_credentials"."expires_at" <= "service_credentials"."issued_at" + interval '7200 seconds'),
	CONSTRAINT "service_credentials_rotation_generation_positive" CHECK ("service_credentials"."rotation_generation" >= 1)
);
--> statement-breakpoint
ALTER TABLE "service_credentials" ADD CONSTRAINT "service_credentials_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_credentials" ADD CONSTRAINT "service_credentials_revoked_by_principals_principal_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_credentials_principal_generation_idx" ON "service_credentials" USING btree ("principal_id","rotation_generation");--> statement-breakpoint
CREATE INDEX "service_credentials_principal_idx" ON "service_credentials" USING btree ("principal_id","expires_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_credentials_active_idx" ON "service_credentials" USING btree ("expires_at") WHERE "service_credentials"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "service_credentials_revoked_live_idx" ON "service_credentials" USING btree ("revoked_at","expires_at") WHERE "service_credentials"."revoked_at" IS NOT NULL;
