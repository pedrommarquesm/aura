CREATE TYPE "public"."aura_event_type" AS ENUM('LIKE', 'SUPER_LIKE', 'BATTLE_WIN', 'CHALLENGE', 'VOTER_REWARD', 'BONUS', 'REVERSAL');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('apple', 'google', 'phone');--> statement-breakpoint
CREATE TYPE "public"."like_kind" AS ENUM('like', 'super_like');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('uploading', 'processing', 'published', 'failed', 'removed');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('r2', 's3', 'bunny', 'local');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'banned');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(30) NOT NULL,
	"display_name" varchar(60),
	"avatar_url" text,
	"country" char(2),
	"city" varchar(120),
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
	"like_count" integer DEFAULT 0 NOT NULL,
	"aura" bigint DEFAULT 0 NOT NULL,
	"trending_score" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
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
CREATE TABLE "likes" (
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"kind" "like_kind" DEFAULT 'like' NOT NULL,
	"aura_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
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
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_events" ADD CONSTRAINT "aura_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_events" ADD CONSTRAINT "aura_events_source_user_id_users_id_fk" FOREIGN KEY ("source_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aura_events" ADD CONSTRAINT "aura_events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "media_assets_post_idx" ON "media_assets" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "media_assets_provider_idx" ON "media_assets" USING btree ("storage_provider");--> statement-breakpoint
CREATE INDEX "media_assets_processing_idx" ON "media_assets" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "likes_post_idx" ON "likes" USING btree ("post_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "likes_user_idx" ON "likes" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aura_events_user_idx" ON "aura_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aura_events_post_idx" ON "aura_events" USING btree ("post_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "aura_events_source_user_idx" ON "aura_events" USING btree ("source_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "aura_events_idempotency_key_idx" ON "aura_events" USING btree ("idempotency_key");