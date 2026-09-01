CREATE TYPE "public"."aura_event_type" AS ENUM('VOTE', 'BATTLE_WIN', 'CHALLENGE', 'VOTER_REWARD', 'BONUS', 'REVERSAL');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('apple', 'google', 'phone', 'password');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."moderation_action_type" AS ENUM('user_status', 'post_remove', 'report_dismiss', 'report_actioned', 'staff_invite', 'staff_update');--> statement-breakpoint
CREATE TYPE "public"."moderation_target_type" AS ENUM('user', 'post', 'report', 'staff');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('uploading', 'processing', 'published', 'failed', 'removed');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'harassment', 'hate', 'sexual', 'violence', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'dismissed', 'actioned');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('user', 'post');--> statement-breakpoint
CREATE TYPE "public"."staff_auth_provider" AS ENUM('google', 'email');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('invited', 'active', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('r2', 's3', 'bunny', 'local');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'banned');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(30) NOT NULL,
	"display_name" varchar(60),
	"avatar_url" text,
	"country" char(2),
	"city" varchar(120),
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"aura" bigint DEFAULT 0 NOT NULL,
	"aura_sense" numeric(5, 4),
	"vote_power" numeric(6, 3) DEFAULT '1' NOT NULL,
	"title" varchar(40),
	"streak" integer DEFAULT 0 NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_sub" text NOT NULL,
	"email_at_signup" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
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
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"caption" text,
	"media_type" "media_type" NOT NULL,
	"status" "post_status" DEFAULT 'uploading' NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"aura" bigint DEFAULT 0 NOT NULL,
	"trending_score" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post_hashtags" (
	"post_id" text NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "post_hashtags_post_id_tag_pk" PRIMARY KEY("post_id","tag")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"storage_provider" "storage_provider" NOT NULL,
	"storage_bucket" varchar(120) NOT NULL,
	"storage_region" varchar(40),
	"storage_key" text NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum" varchar(128),
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"variants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_provider" varchar(40),
	"external_asset_id" varchar(120),
	"processing_status" "processing_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"amount" integer NOT NULL,
	"receipt" varchar(80),
	"aura_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id"),
	CONSTRAINT "votes_amount_nonzero" CHECK ("votes"."amount" <> 0),
	CONSTRAINT "votes_amount_in_range" CHECK ("votes"."amount" >= -100 AND "votes"."amount" <= 100)
);
--> statement-breakpoint
CREATE TABLE "aura_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_user_id" text,
	"post_id" text,
	"type" "aura_event_type" NOT NULL,
	"amount" bigint NOT NULL,
	"metadata" jsonb,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason" "report_reason" NOT NULL,
	"note" varchar(500),
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
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
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"email" varchar(320) NOT NULL,
	"message" text NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"to_email" varchar(320) NOT NULL,
	"template" varchar(40) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"subject" varchar(200) NOT NULL,
	"text_body" text NOT NULL,
	"html_body" text NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"referral_code" varchar(12) NOT NULL,
	"referred_by_id" text,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"aura" bigint DEFAULT 0 NOT NULL,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"claimed_user_id" text,
	"claimed_at" timestamp with time zone,
	"referral_credited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_events" ADD CONSTRAINT "aura_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_events" ADD CONSTRAINT "aura_events_source_user_id_users_id_fk" FOREIGN KEY ("source_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_events" ADD CONSTRAINT "aura_events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_identities" ADD CONSTRAINT "staff_identities_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_referred_by_id_waitlist_entries_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_claimed_user_id_users_id_fk" FOREIGN KEY ("claimed_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_idx" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_aura_idx" ON "users" USING btree ("aura" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "users_country_aura_idx" ON "users" USING btree ("country","aura" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_provider_sub_idx" ON "auth_identities" USING btree ("provider","provider_sub");--> statement-breakpoint
CREATE INDEX "auth_identities_user_idx" ON "auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_sessions_refresh_hash_idx" ON "device_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "device_sessions_user_idx" ON "device_sessions" USING btree ("user_id","last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "device_sessions_family_idx" ON "device_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "posts"."status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_trending_idx" ON "posts" USING btree ("trending_score" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "posts"."status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "post_hashtags_tag_idx" ON "post_hashtags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "media_assets_post_idx" ON "media_assets" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "media_assets_provider_idx" ON "media_assets" USING btree ("storage_provider");--> statement-breakpoint
CREATE INDEX "media_assets_processing_idx" ON "media_assets" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "votes_post_idx" ON "votes" USING btree ("post_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "votes_user_idx" ON "votes" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aura_events_user_idx" ON "aura_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aura_events_post_idx" ON "aura_events" USING btree ("post_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aura_events_source_user_idx" ON "aura_events" USING btree ("source_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "aura_events_idempotency_key_idx" ON "aura_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reporter_target_idx" ON "reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_email_lower_idx" ON "staff" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "staff_role_idx" ON "staff" USING btree ("role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_identities_provider_sub_idx" ON "staff_identities" USING btree ("provider","provider_sub");--> statement-breakpoint
CREATE INDEX "staff_identities_staff_idx" ON "staff_identities" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_sessions_refresh_hash_idx" ON "staff_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "staff_sessions_staff_idx" ON "staff_sessions" USING btree ("staff_id","last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "staff_sessions_family_idx" ON "staff_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_idx" ON "moderation_actions" USING btree ("target_type","target_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "moderation_actions_staff_idx" ON "moderation_actions" USING btree ("staff_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "moderation_actions_created_idx" ON "moderation_actions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "email_outbox_status_idx" ON "email_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_to_idx" ON "email_outbox" USING btree ("to_email","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_email_lower_idx" ON "waitlist_entries" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_referral_code_idx" ON "waitlist_entries" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_claimed_user_idx" ON "waitlist_entries" USING btree ("claimed_user_id");--> statement-breakpoint
CREATE INDEX "waitlist_entries_referred_by_idx" ON "waitlist_entries" USING btree ("referred_by_id");