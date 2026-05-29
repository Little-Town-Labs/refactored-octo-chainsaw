CREATE TABLE "clerk_invitations" (
  "invitation_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "clerk_invitation_id" text NOT NULL,
  "family" text NOT NULL,
  "status" text NOT NULL,
  "email_hash" text,
  "org_clerk_id" text,
  "org_id" uuid,
  "role" text,
  "last_event_type" text NOT NULL,
  "clerk_created_at" timestamp with time zone,
  "clerk_updated_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "clerk_invitations_family_check" CHECK ("clerk_invitations"."family" IN ('application','organization')),
  CONSTRAINT "clerk_invitations_status_check" CHECK ("clerk_invitations"."status" IN ('pending','accepted','revoked','expired')),
  CONSTRAINT "clerk_invitations_clerk_id_check" CHECK ("clerk_invitations"."clerk_invitation_id" <> ''),
  CONSTRAINT "clerk_invitations_event_type_check" CHECK ("clerk_invitations"."last_event_type" <> '')
);
--> statement-breakpoint
ALTER TABLE "clerk_invitations" ADD CONSTRAINT "clerk_invitations_org_id_organizations_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "clerk_invitations_clerk_id_idx" ON "clerk_invitations" USING btree ("clerk_invitation_id");
--> statement-breakpoint
CREATE INDEX "clerk_invitations_family_status_idx" ON "clerk_invitations" USING btree ("family","status","updated_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "clerk_invitations_org_idx" ON "clerk_invitations" USING btree ("org_id","updated_at" DESC NULLS LAST) WHERE "clerk_invitations"."org_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "clerk_invitations_org_clerk_idx" ON "clerk_invitations" USING btree ("org_clerk_id","updated_at" DESC NULLS LAST) WHERE "clerk_invitations"."org_clerk_id" IS NOT NULL;
