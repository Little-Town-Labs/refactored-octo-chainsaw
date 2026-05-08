CREATE TABLE "agent_credentials" (
	"credential_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"principal_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"side" text NOT NULL,
	"contract_id" text NOT NULL,
	"contract_version" text NOT NULL,
	"ticket_id" uuid NOT NULL,
	"scope_set" jsonb NOT NULL,
	"kid" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revocation_reason" text,
	CONSTRAINT "agent_credentials_side_check" CHECK ("agent_credentials"."side" IN ('seeker', 'employer')),
	CONSTRAINT "agent_credentials_scope_set_nonempty" CHECK (jsonb_typeof("agent_credentials"."scope_set") = 'array' AND jsonb_array_length("agent_credentials"."scope_set") >= 1),
	CONSTRAINT "agent_credentials_ttl_ceiling" CHECK ("agent_credentials"."expires_at" <= "agent_credentials"."issued_at" + interval '7200 seconds')
);
--> statement-breakpoint
CREATE TABLE "revocations" (
	"credential_id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "revocations_kind_check" CHECK ("revocations"."kind" IN ('agent', 'service'))
);
--> statement-breakpoint
CREATE TABLE "signing_keys" (
	"kid" text PRIMARY KEY NOT NULL,
	"algorithm" text DEFAULT 'EdDSA' NOT NULL,
	"public_key_jwk" jsonb NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"verify_until" timestamp with time zone,
	CONSTRAINT "signing_keys_purpose_check" CHECK ("signing_keys"."purpose" IN ('agent', 'service')),
	CONSTRAINT "signing_keys_algorithm_check" CHECK ("signing_keys"."algorithm" IN ('EdDSA'))
);
--> statement-breakpoint
ALTER TABLE "agent_credentials" ADD CONSTRAINT "agent_credentials_principal_id_principals_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_credentials" ADD CONSTRAINT "agent_credentials_revoked_by_principals_principal_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_credentials_idempotency_idx" ON "agent_credentials" USING btree ("run_id","side","contract_id","contract_version");--> statement-breakpoint
CREATE INDEX "agent_credentials_active_idx" ON "agent_credentials" USING btree ("expires_at") WHERE "agent_credentials"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "agent_credentials_revoked_live_idx" ON "agent_credentials" USING btree ("revoked_at","expires_at") WHERE "agent_credentials"."revoked_at" IS NOT NULL AND "agent_credentials"."expires_at" > now();--> statement-breakpoint
CREATE INDEX "agent_credentials_ticket_idx" ON "agent_credentials" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "revocations_expires_at_idx" ON "revocations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signing_keys_active_per_purpose_idx" ON "signing_keys" USING btree ("purpose") WHERE "signing_keys"."activated_at" IS NOT NULL AND "signing_keys"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "signing_keys_jwks_idx" ON "signing_keys" USING btree ("purpose","verify_until" DESC NULLS LAST) WHERE "signing_keys"."verify_until" IS NULL OR "signing_keys"."verify_until" > now();