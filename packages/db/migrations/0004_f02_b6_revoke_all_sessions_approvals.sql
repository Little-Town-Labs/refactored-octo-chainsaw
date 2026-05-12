CREATE TABLE "revoke_all_sessions_approvals" (
	"approval_id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_principal_id" uuid NOT NULL,
	"initiated_by" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"notes" text,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	CONSTRAINT "revoke_all_sessions_approvals_distinct_operators_check" CHECK ("revoke_all_sessions_approvals"."approved_by" IS NULL OR "revoke_all_sessions_approvals"."approved_by" <> "revoke_all_sessions_approvals"."initiated_by"),
	CONSTRAINT "revoke_all_sessions_approvals_reason_code_check" CHECK ("revoke_all_sessions_approvals"."reason_code" IN ('session_compromise', 'operator_emergency', 'credential_rotation', 'compliance_action'))
);
--> statement-breakpoint
ALTER TABLE "revoke_all_sessions_approvals" ADD CONSTRAINT "revoke_all_sessions_approvals_target_principal_id_principals_principal_id_fk" FOREIGN KEY ("target_principal_id") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revoke_all_sessions_approvals" ADD CONSTRAINT "revoke_all_sessions_approvals_initiated_by_principals_principal_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revoke_all_sessions_approvals" ADD CONSTRAINT "revoke_all_sessions_approvals_approved_by_principals_principal_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."principals"("principal_id") ON DELETE no action ON UPDATE no action;