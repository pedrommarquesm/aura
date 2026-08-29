CREATE TYPE "public"."moderation_action_type" AS ENUM('user_status', 'post_remove', 'report_dismiss', 'report_actioned', 'staff_invite', 'staff_update');--> statement-breakpoint
CREATE TYPE "public"."moderation_target_type" AS ENUM('user', 'post', 'report', 'staff');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'dismissed', 'actioned');--> statement-breakpoint
CREATE TYPE "public"."staff_auth_provider" AS ENUM('google', 'email');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('invited', 'active', 'deactivated');--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "status" "report_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at" DESC);--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(80),
	"role" "staff_role" DEFAULT 'moderator' NOT NULL,
	"status" "staff_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"provider" "staff_auth_provider" NOT NULL,
	"provider_sub" text NOT NULL,
	"email_at_signup" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"family_id" text NOT NULL,
	"device_name" varchar(120),
	"platform" varchar(20),
	"app_version" varchar(20),
	"ip_at_issue" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text,
	"action" "moderation_action_type" NOT NULL,
	"target_type" "moderation_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_identities" ADD CONSTRAINT "staff_identities_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_email_lower_idx" ON "staff" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "staff_role_idx" ON "staff" USING btree ("role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_identities_provider_sub_idx" ON "staff_identities" USING btree ("provider","provider_sub");--> statement-breakpoint
CREATE INDEX "staff_identities_staff_idx" ON "staff_identities" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_sessions_refresh_hash_idx" ON "staff_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "staff_sessions_staff_idx" ON "staff_sessions" USING btree ("staff_id","last_seen_at" DESC);--> statement-breakpoint
CREATE INDEX "staff_sessions_family_idx" ON "staff_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_idx" ON "moderation_actions" USING btree ("target_type","target_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "moderation_actions_staff_idx" ON "moderation_actions" USING btree ("staff_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "moderation_actions_created_idx" ON "moderation_actions" USING btree ("created_at" DESC);
